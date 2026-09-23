import { Router, type Request } from 'express'
import { and, count, desc, eq, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { env } from '../config/env.js'
import { db, schema } from '../db/client.js'
import type { LatLng } from '../db/schema.js'
import {
  CONDICOES,
  GRAVIDADES,
  latLng,
  RAIO_ALERTA_DUPLICADO_M,
  texto,
  textoObrigatorio,
  TIPOS_ALERTA,
  TIPOS_ROTA,
  uuidParam,
} from '../lib/dominio.js'
import { conflito, naoEncontrado, regraNegocio } from '../lib/erros.js'
import { comprimentoMetros, distanciaMetros } from '../lib/geo.js'
import { autenticar, eu, exigirDonoOuAdmin, somenteAdmin, validar, validarParcial } from '../middlewares/http.js'

const { rotas, alertas, confirmacoes, usuarios } = schema
type AlvoTipo = 'rota' | 'alerta'

export const mapaRouter = Router()
mapaRouter.use(['/rotas', '/alertas'], autenticar)

// ---------------------------------------------------------------------------
// Confirmações comunitárias (compartilhado entre rotas e alertas)
// ---------------------------------------------------------------------------

async function confirmacoesPorAlvo(alvoTipo: AlvoTipo, alvoId?: string) {
  const linhas = await db
    .select({ alvoId: confirmacoes.alvoId, usuarioId: confirmacoes.usuarioId })
    .from(confirmacoes)
    .where(
      alvoId
        ? and(eq(confirmacoes.alvoTipo, alvoTipo), eq(confirmacoes.alvoId, alvoId))
        : eq(confirmacoes.alvoTipo, alvoTipo),
    )
    .orderBy(confirmacoes.criadoEm)
  const mapa = new Map<string, string[]>()
  for (const l of linhas) mapa.set(l.alvoId, [...(mapa.get(l.alvoId) ?? []), l.usuarioId])
  return mapa
}

async function contarConfirmacoes(alvoTipo: AlvoTipo, alvoId: string) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(confirmacoes)
    .where(and(eq(confirmacoes.alvoTipo, alvoTipo), eq(confirmacoes.alvoId, alvoId)))
  return total
}

/**
 * Regra de validação comunitária: a rota fica "validada" quando atinge
 * LIMIAR_VALIDACAO_ROTA confirmações de outros moradores e volta a
 * "pendente" se cair abaixo. Rotas recusadas pela diretoria não mudam sozinhas.
 */
async function recalcularStatusRota(id: string) {
  const [rota] = await db.select({ status: rotas.status }).from(rotas).where(eq(rotas.id, id))
  if (!rota || rota.status === 'recusada') return
  const total = await contarConfirmacoes('rota', id)
  const novo = total >= env.LIMIAR_VALIDACAO_ROTA ? 'validada' : 'pendente'
  if (novo !== rota.status) await db.update(rotas).set({ status: novo }).where(eq(rotas.id, id))
}

async function confirmar(req: Request, alvoTipo: AlvoTipo, alvo: { autorId: string | null }, alvoId: string) {
  const u = eu(req)
  if (alvo.autorId === u.id) {
    throw regraNegocio('Você não pode confirmar o que você mesmo cadastrou — peça a um vizinho.')
  }
  await db.insert(confirmacoes).values({ alvoTipo, alvoId, usuarioId: u.id }).onConflictDoNothing()
}

async function desconfirmar(req: Request, alvoTipo: AlvoTipo, alvoId: string) {
  await db
    .delete(confirmacoes)
    .where(
      and(
        eq(confirmacoes.alvoTipo, alvoTipo),
        eq(confirmacoes.alvoId, alvoId),
        eq(confirmacoes.usuarioId, eu(req).id),
      ),
    )
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

export const rotaBase = z.object({
  nome: textoObrigatorio(120),
  tipo: z.enum(TIPOS_ROTA),
  condicao: z.enum(CONDICOES),
  iluminacao: z.boolean().default(false),
  acessivel: z.boolean().default(false),
  descricao: texto(1000).default(''),
  pontos: z
    .array(latLng)
    .min(2, 'Desenhe ao menos 2 pontos para criar uma rota.')
    .max(500, 'A rota tem pontos demais (máx. 500).'),
})

function exigirExtensao(pontos: LatLng[]) {
  if (comprimentoMetros(pontos) < 1) throw regraNegocio('Os pontos da rota estão sobrepostos.')
}

async function carregarRota(id: string) {
  const [r] = await db.select().from(rotas).where(eq(rotas.id, id))
  if (!r) throw naoEncontrado('Rota')
  return r
}

async function listarRotas(condicao?: SQL) {
  const [linhas, confs] = await Promise.all([
    db
      .select({ rota: rotas, autor: usuarios.nome })
      .from(rotas)
      .leftJoin(usuarios, eq(usuarios.id, rotas.autorId))
      .where(condicao)
      .orderBy(desc(rotas.criadaEm)),
    confirmacoesPorAlvo('rota'),
  ])
  return linhas.map(({ rota, autor }) => ({
    ...rota,
    autor: autor ?? 'Morador removido',
    confirmacoes: confs.get(rota.id) ?? [],
    comprimentoMetros: Math.round(comprimentoMetros(rota.pontos)),
  }))
}

const rotaSerializada = async (id: string) => (await listarRotas(eq(rotas.id, id)))[0]

mapaRouter.get('/rotas', async (req, res) => {
  const f = validar(
    z.object({ tipo: z.enum(TIPOS_ROTA).optional(), status: z.enum(['pendente', 'validada', 'recusada']).optional() }),
    req.query,
  )
  const cond: SQL[] = []
  if (f.tipo) cond.push(eq(rotas.tipo, f.tipo))
  if (f.status) cond.push(eq(rotas.status, f.status))
  res.json(await listarRotas(cond.length ? and(...cond) : undefined))
})

mapaRouter.get('/rotas/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  await carregarRota(id)
  res.json(await rotaSerializada(id))
})

mapaRouter.post('/rotas', async (req, res) => {
  const dados = validar(rotaBase, req.body)
  exigirExtensao(dados.pontos)
  // Toda rota nasce pendente; autor vem do token, nunca do corpo.
  const [nova] = await db
    .insert(rotas)
    .values({ ...dados, status: 'pendente', autorId: eu(req).id })
    .returning()
  res.status(201).json(await rotaSerializada(nova.id))
})

mapaRouter.patch('/rotas/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const dados = validarParcial(rotaBase, req.body)
  const atual = await carregarRota(id)
  exigirDonoOuAdmin(req, atual.autorId)

  const mudouTracado = dados.pontos && JSON.stringify(dados.pontos) !== JSON.stringify(atual.pontos)
  if (dados.pontos) exigirExtensao(dados.pontos)

  await db.transaction(async (tx) => {
    // Se o traçado mudou, as confirmações antigas não valem mais: volta a pendente.
    if (mudouTracado) {
      await tx.delete(confirmacoes).where(and(eq(confirmacoes.alvoTipo, 'rota'), eq(confirmacoes.alvoId, id)))
    }
    await tx
      .update(rotas)
      .set({ ...dados, ...(mudouTracado ? { status: 'pendente' as const } : {}) })
      .where(eq(rotas.id, id))
  })
  res.json(await rotaSerializada(id))
})

mapaRouter.delete('/rotas/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const atual = await carregarRota(id)
  exigirDonoOuAdmin(req, atual.autorId)
  await db.transaction(async (tx) => {
    await tx.delete(confirmacoes).where(and(eq(confirmacoes.alvoTipo, 'rota'), eq(confirmacoes.alvoId, id)))
    await tx.delete(rotas).where(eq(rotas.id, id))
  })
  res.status(204).end()
})

mapaRouter.post('/rotas/:id/confirmacao', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const rota = await carregarRota(id)
  if (rota.status === 'recusada') throw regraNegocio('Esta rota foi recusada pela diretoria.')
  await confirmar(req, 'rota', rota, id)
  await recalcularStatusRota(id)
  res.json(await rotaSerializada(id))
})

mapaRouter.delete('/rotas/:id/confirmacao', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  await carregarRota(id)
  await desconfirmar(req, 'rota', id)
  await recalcularStatusRota(id)
  res.json(await rotaSerializada(id))
})

/** Decisão manual da diretoria (ex.: rota perigosa ou falsa). */
mapaRouter.patch('/rotas/:id/status', somenteAdmin, async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const { status } = validar(z.object({ status: z.enum(['pendente', 'validada', 'recusada']) }), req.body)
  await carregarRota(id)
  await db.update(rotas).set({ status }).where(eq(rotas.id, id))
  res.json(await rotaSerializada(id))
})

// ---------------------------------------------------------------------------
// Alertas
// ---------------------------------------------------------------------------

export const alertaBase = z.object({
  tipo: z.enum(TIPOS_ALERTA),
  gravidade: z.enum(GRAVIDADES),
  descricao: texto(1000).default(''),
  ponto: latLng,
})

const PESO_GRAVIDADE: Record<string, number> = { Alta: 3, Média: 2, Baixa: 1 }

async function carregarAlerta(id: string) {
  const [a] = await db.select().from(alertas).where(eq(alertas.id, id))
  if (!a) throw naoEncontrado('Alerta')
  return a
}

async function listarAlertas(condicao?: SQL) {
  const [linhas, confs] = await Promise.all([
    db
      .select({ alerta: alertas, autor: usuarios.nome })
      .from(alertas)
      .leftJoin(usuarios, eq(usuarios.id, alertas.autorId))
      .where(condicao)
      .orderBy(desc(alertas.criadoEm)),
    confirmacoesPorAlvo('alerta'),
  ])
  return linhas
    .map(({ alerta: { lat, lng, ...a }, autor }) => {
      const lista = confs.get(a.id) ?? []
      return {
        ...a,
        ponto: { lat, lng },
        autor: autor ?? 'Morador removido',
        confirmacoes: lista,
        // Prioridade para a diretoria: gravidade pesa mais que confirmações.
        prioridade: a.resolvido ? 0 : PESO_GRAVIDADE[a.gravidade] * 10 + lista.length,
      }
    })
    .sort((x, y) => y.prioridade - x.prioridade)
}

const alertaSerializado = async (id: string) => (await listarAlertas(eq(alertas.id, id)))[0]

mapaRouter.get('/alertas', async (req, res) => {
  const f = validar(
    z.object({
      tipo: z.enum(TIPOS_ALERTA).optional(),
      resolvido: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
    }),
    req.query,
  )
  const cond: SQL[] = []
  if (f.tipo) cond.push(eq(alertas.tipo, f.tipo))
  if (f.resolvido !== undefined) cond.push(eq(alertas.resolvido, f.resolvido))
  res.json(await listarAlertas(cond.length ? and(...cond) : undefined))
})

mapaRouter.post('/alertas', async (req, res) => {
  const { ponto, ...dados } = validar(alertaBase, req.body)

  // Evita alertas duplicados: se já existe um aberto do mesmo tipo muito perto,
  // o morador deve confirmar o existente em vez de criar outro.
  const abertos = await db
    .select({ id: alertas.id, lat: alertas.lat, lng: alertas.lng })
    .from(alertas)
    .where(and(eq(alertas.tipo, dados.tipo), eq(alertas.resolvido, false)))
  const proximo = abertos
    .map((a) => ({ id: a.id, distancia: distanciaMetros(ponto, a) }))
    .filter((a) => a.distancia <= RAIO_ALERTA_DUPLICADO_M)
    .sort((a, b) => a.distancia - b.distancia)[0]
  if (proximo) {
    throw conflito(
      `Já existe um alerta de "${dados.tipo}" a ${Math.round(proximo.distancia)} m daqui. Confirme o alerta existente.`,
      { alertaExistenteId: proximo.id },
    )
  }

  const [novo] = await db
    .insert(alertas)
    .values({ ...dados, lat: ponto.lat, lng: ponto.lng, autorId: eu(req).id })
    .returning()
  res.status(201).json(await alertaSerializado(novo.id))
})

mapaRouter.patch('/alertas/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const { ponto, ...dados } = validarParcial(alertaBase, req.body)
  const atual = await carregarAlerta(id)
  exigirDonoOuAdmin(req, atual.autorId)
  await db
    .update(alertas)
    .set({ ...dados, ...(ponto ? { lat: ponto.lat, lng: ponto.lng } : {}) })
    .where(eq(alertas.id, id))
  res.json(await alertaSerializado(id))
})

mapaRouter.post('/alertas/:id/resolver', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const { resolvido } = validar(z.object({ resolvido: z.boolean().default(true) }), req.body ?? {})
  const atual = await carregarAlerta(id)
  exigirDonoOuAdmin(req, atual.autorId)
  await db
    .update(alertas)
    .set({
      resolvido,
      resolvidoEm: resolvido ? new Date() : null,
      resolvidoPor: resolvido ? eu(req).id : null,
    })
    .where(eq(alertas.id, id))
  res.json(await alertaSerializado(id))
})

mapaRouter.delete('/alertas/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const atual = await carregarAlerta(id)
  exigirDonoOuAdmin(req, atual.autorId)
  await db.transaction(async (tx) => {
    await tx.delete(confirmacoes).where(and(eq(confirmacoes.alvoTipo, 'alerta'), eq(confirmacoes.alvoId, id)))
    await tx.delete(alertas).where(eq(alertas.id, id))
  })
  res.status(204).end()
})

mapaRouter.post('/alertas/:id/confirmacao', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const alerta = await carregarAlerta(id)
  if (alerta.resolvido) throw regraNegocio('Este alerta já foi resolvido.')
  await confirmar(req, 'alerta', alerta, id)
  res.json(await alertaSerializado(id))
})

mapaRouter.delete('/alertas/:id/confirmacao', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  await carregarAlerta(id)
  await desconfirmar(req, 'alerta', id)
  res.json(await alertaSerializado(id))
})
