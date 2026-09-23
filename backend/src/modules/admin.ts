import crypto from 'node:crypto'
import { Router } from 'express'
import { count, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/client.js'
import { SEED } from '../db/demo.js'
import { auditar } from '../lib/auditoria.js'
import { regraNegocio } from '../lib/erros.js'
import { comprimentoMetros } from '../lib/geo.js'
import { faixaVulnerabilidade, indiceVulnerabilidade } from '../lib/vulnerabilidade.js'
import { autenticar, eu, somenteAdmin, validar } from '../middlewares/http.js'
import { comercioBase, freelancerBase } from './guia.js'
import { alertaBase, rotaBase } from './mapa.js'
import { casaBase, familiaBase } from './social.js'

const { rotas, alertas, confirmacoes, comercios, freelancers, casas, familias, usuarios, auditoria } = schema

// ---------------------------------------------------------------------------
// Painel — indicadores da comunidade
// ---------------------------------------------------------------------------

export const painelRouter = Router()
painelRouter.use(autenticar)

painelRouter.get('/', async (req, res) => {
  const [listaRotas, listaAlertas, [{ totalComercios }], [{ totalFreelancers }]] = await Promise.all([
    db.select({ status: rotas.status, pontos: rotas.pontos }).from(rotas),
    db.select({ gravidade: alertas.gravidade, resolvido: alertas.resolvido }).from(alertas),
    db.select({ totalComercios: count() }).from(comercios),
    db.select({ totalFreelancers: count() }).from(freelancers),
  ])

  const abertos = listaAlertas.filter((a) => !a.resolvido)
  const painel: Record<string, unknown> = {
    rotas: {
      total: listaRotas.length,
      validadas: listaRotas.filter((r) => r.status === 'validada').length,
      pendentes: listaRotas.filter((r) => r.status === 'pendente').length,
      kmMapeados:
        Math.round(listaRotas.reduce((acc, r) => acc + comprimentoMetros(r.pontos), 0) / 10) / 100,
    },
    alertas: {
      abertos: abertos.length,
      resolvidos: listaAlertas.length - abertos.length,
      porGravidade: {
        Alta: abertos.filter((a) => a.gravidade === 'Alta').length,
        Média: abertos.filter((a) => a.gravidade === 'Média').length,
        Baixa: abertos.filter((a) => a.gravidade === 'Baixa').length,
      },
    },
    comercios: totalComercios,
    freelancers: totalFreelancers,
  }

  // Indicadores sociais só para a diretoria.
  if (eu(req).perfil === 'ADMIN') {
    const [listaCasas, linhasFamilias, [{ pendentes }]] = await Promise.all([
      db.select().from(casas),
      db.select({ f: familias, c: casas }).from(familias).leftJoin(casas, eq(casas.id, familias.casaId)),
      db.select({ pendentes: count() }).from(usuarios).where(eq(usuarios.status, 'PENDENTE')),
    ])
    const porFaixa = { Crítica: 0, Alta: 0, Média: 0, Baixa: 0 }
    for (const { f, c } of linhasFamilias) porFaixa[faixaVulnerabilidade(indiceVulnerabilidade(f, c))]++

    painel.casas = {
      total: listaCasas.length,
      semAguaEncanada: listaCasas.filter((c) => !c.aguaEncanada).length,
      semEsgoto: listaCasas.filter((c) => !c.esgoto).length,
      semEnergia: listaCasas.filter((c) => !c.energiaEletrica).length,
      emAreaDeRisco: listaCasas.filter((c) => c.riscos.length > 0).length,
    }
    painel.familias = {
      total: linhasFamilias.length,
      pessoas: linhasFamilias.reduce((acc, { f }) => acc + f.membros.length, 0),
      porFaixa,
      semBeneficio: linhasFamilias.filter(
        ({ f }) => f.beneficios.length === 0 || f.beneficios.includes('Nenhum'),
      ).length,
    }
    painel.cadastrosPendentes = pendentes
  }

  res.json(painel)
})

// ---------------------------------------------------------------------------
// Administração de dados
// ---------------------------------------------------------------------------

export const adminRouter = Router()
adminRouter.use(autenticar, somenteAdmin)

/** Formato de import/export — o mesmo "Estado" que o app salvava no aparelho. */
const pacoteSchema = z.object({
  rotas: z.array(z.any()).default([]),
  alertas: z.array(z.any()).default([]),
  comercios: z.array(z.any()).default([]),
  freelancers: z.array(z.any()).default([]),
  casas: z.array(z.any()).default([]),
  familias: z.array(z.any()).default([]),
})

function validarItens<T extends z.ZodType>(nome: string, s: T, itens: unknown[]): z.infer<T>[] {
  return itens.map((item, i) => {
    const r = s.safeParse(item)
    if (!r.success) {
      const issue = r.error.issues[0]
      throw regraNegocio(`${nome}[${i}] inválido — ${issue.path.join('.')}: ${issue.message}`)
    }
    return r.data
  })
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function apagarConteudo(tx: Tx) {
  await tx.delete(confirmacoes)
  await tx.delete(rotas)
  await tx.delete(alertas)
  await tx.delete(comercios)
  await tx.delete(freelancers)
  await tx.delete(familias)
  await tx.delete(casas)
}

/**
 * Importa um pacote. IDs antigos são trocados por UUIDs novos (mantendo o
 * vínculo família→casa); autoria passa para o admin que importou, porque o
 * arquivo antigo só guardava o nome do autor.
 */
async function importar(pacoteBruto: unknown, autorId: string, substituir: boolean) {
  const p = validar(pacoteSchema, pacoteBruto)
  const dados = {
    rotas: validarItens('rotas', rotaBase.extend({ status: z.enum(['pendente', 'validada', 'recusada']).default('pendente') }), p.rotas),
    alertas: validarItens('alertas', alertaBase.extend({ resolvido: z.boolean().default(false) }), p.alertas),
    comercios: validarItens('comercios', comercioBase, p.comercios),
    freelancers: validarItens('freelancers', freelancerBase, p.freelancers),
    casas: validarItens('casas', casaBase.extend({ id: z.string().optional() }), p.casas),
    familias: validarItens('familias', familiaBase.extend({ casaId: z.string().nullish() }), p.familias),
  }

  await db.transaction(async (tx) => {
    if (substituir) await apagarConteudo(tx)

    const idsCasas = new Map<string, string>()
    for (const { id: antigo, ponto, ...c } of dados.casas) {
      const novoId = crypto.randomUUID()
      if (antigo) idsCasas.set(antigo, novoId)
      await tx.insert(casas).values({ ...c, id: novoId, lat: ponto?.lat ?? null, lng: ponto?.lng ?? null })
    }
    for (const f of dados.familias) {
      await tx.insert(familias).values({
        ...f,
        casaId: f.casaId ? (idsCasas.get(f.casaId) ?? null) : null,
        membros: f.membros.map((m) => ({ ...m, id: m.id || crypto.randomUUID() })),
      })
    }
    for (const r of dados.rotas) await tx.insert(rotas).values({ ...r, autorId })
    for (const { ponto, ...a } of dados.alertas) {
      await tx.insert(alertas).values({ ...a, lat: ponto.lat, lng: ponto.lng, autorId })
    }
    for (const { ponto, ...c } of dados.comercios) {
      await tx.insert(comercios).values({ ...c, lat: ponto?.lat ?? null, lng: ponto?.lng ?? null, autorId })
    }
    for (const f of dados.freelancers) await tx.insert(freelancers).values({ ...f, autorId })
  })

  return Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, v.length]))
}

adminRouter.get('/exportar', async (req, res) => {
  const [r, a, c, f, ca, fa] = await Promise.all([
    db.select().from(rotas),
    db.select().from(alertas),
    db.select().from(comercios),
    db.select().from(freelancers),
    db.select().from(casas),
    db.select().from(familias),
  ])
  const comPonto = <T extends { lat: number | null; lng: number | null }>({ lat, lng, ...x }: T) => ({
    ...x,
    ponto: lat != null && lng != null ? { lat, lng } : undefined,
  })
  await auditar(eu(req).id, 'EXPORTAR', 'base', null)
  res.json({
    exportadoEm: new Date().toISOString(),
    rotas: r,
    alertas: a.map(comPonto),
    comercios: c.map(comPonto),
    freelancers: f,
    casas: ca.map(comPonto),
    familias: fa,
  })
})

adminRouter.post('/importar', async (req, res) => {
  const { dados, substituir } = validar(
    z.object({ dados: z.unknown(), substituir: z.boolean().default(false) }),
    req.body,
  )
  const totais = await importar(dados, eu(req).id, substituir)
  await auditar(eu(req).id, 'IMPORTAR', 'base', null, { totais, substituir })
  res.json({ mensagem: 'Dados importados.', totais })
})

adminRouter.post('/demo', async (req, res) => {
  const totais = await importar(SEED, eu(req).id, true)
  await auditar(eu(req).id, 'RESTAURAR_DEMO', 'base', null)
  res.json({ mensagem: 'Dados de demonstração carregados.', totais })
})

adminRouter.delete('/dados', async (req, res) => {
  // Confirmação explícita no corpo para evitar apagar tudo por engano.
  validar(z.object({ confirmacao: z.literal('APAGAR TUDO', 'Envie confirmacao: "APAGAR TUDO".') }), req.body)
  await db.transaction(apagarConteudo)
  await auditar(eu(req).id, 'APAGAR_TUDO', 'base', null)
  res.status(204).end()
})

adminRouter.get('/auditoria', async (req, res) => {
  const { limite } = validar(z.object({ limite: z.coerce.number().int().min(1).max(500).default(100) }), req.query)
  const linhas = await db
    .select({ registro: auditoria, usuario: usuarios.nome })
    .from(auditoria)
    .leftJoin(usuarios, eq(usuarios.id, auditoria.usuarioId))
    .orderBy(desc(auditoria.criadoEm))
    .limit(limite)
  res.json(linhas.map(({ registro, usuario }) => ({ ...registro, usuario })))
})
