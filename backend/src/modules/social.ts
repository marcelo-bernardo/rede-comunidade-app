import crypto from 'node:crypto'
import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/client.js'
import { auditar } from '../lib/auditoria.js'
import { nisValido, soDigitos } from '../lib/documentos.js'
import {
  BENEFICIOS,
  ESCOLARIDADES,
  latLng,
  PARENTESCOS,
  RISCOS,
  SITUACOES_MORADIA,
  texto,
  textoObrigatorio,
  TIPOS_CONSTRUCAO,
  uuidParam,
} from '../lib/dominio.js'
import { naoEncontrado, regraNegocio } from '../lib/erros.js'
import { faixaVulnerabilidade, indiceVulnerabilidade } from '../lib/vulnerabilidade.js'
import { autenticar, eu, somenteAdmin, validar, validarParcial } from '../middlewares/http.js'

const { casas, familias } = schema
type Casa = typeof casas.$inferSelect
type Familia = typeof familias.$inferSelect

/**
 * Casas e famílias guardam dados pessoais sensíveis (renda, saúde, NIS).
 * Pela LGPD, o acesso fica restrito à diretoria e toda alteração é auditada.
 */
export const socialRouter = Router()
socialRouter.use(['/casas', '/familias'], autenticar, somenteAdmin)

// ---------------------------------------------------------------------------
// Casas
// ---------------------------------------------------------------------------

export const casaBase = z.object({
  apelido: textoObrigatorio(120),
  endereco: texto(200).default(''),
  quadra: texto(20).default(''),
  lote: texto(20).default(''),
  tipoConstrucao: z.enum(TIPOS_CONSTRUCAO),
  situacao: z.enum(SITUACOES_MORADIA),
  comodos: z.number().int().min(1, 'A casa precisa ter ao menos 1 cômodo.').max(50),
  aguaEncanada: z.boolean().default(false),
  esgoto: z.boolean().default(false),
  energiaEletrica: z.boolean().default(false),
  coletaLixo: z.boolean().default(false),
  riscos: z.array(z.enum(RISCOS)).max(RISCOS.length).default([]),
  ponto: latLng.nullish(),
  observacoes: texto(2000).default(''),
})

function serializarCasa({ lat, lng, ...c }: Casa, familiasDaCasa: Familia[] = []) {
  const moradores = familiasDaCasa.reduce((acc, f) => acc + f.membros.length, 0)
  return {
    ...c,
    ponto: lat != null && lng != null ? { lat, lng } : undefined,
    totalFamilias: familiasDaCasa.length,
    totalMoradores: moradores,
    // Critério IBGE de adensamento excessivo: mais de 2 moradores por cômodo.
    superlotada: c.comodos > 0 && moradores / c.comodos > 2,
  }
}

const pontoParaColunas = (ponto: { lat: number; lng: number } | null | undefined) =>
  ponto === undefined ? {} : { lat: ponto?.lat ?? null, lng: ponto?.lng ?? null }

async function carregarCasa(id: string) {
  const [c] = await db.select().from(casas).where(eq(casas.id, id))
  if (!c) throw naoEncontrado('Casa')
  return c
}

socialRouter.get('/casas', async (_req, res) => {
  const [lista, todas] = await Promise.all([
    db.select().from(casas).orderBy(desc(casas.criadaEm)),
    db.select().from(familias),
  ])
  res.json(lista.map((c) => serializarCasa(c, todas.filter((f) => f.casaId === c.id))))
})

socialRouter.post('/casas', async (req, res) => {
  const { ponto, ...dados } = validar(casaBase, req.body)
  const [nova] = await db.insert(casas).values({ ...dados, ...pontoParaColunas(ponto) }).returning()
  await auditar(eu(req).id, 'CRIAR', 'casa', nova.id)
  res.status(201).json(serializarCasa(nova))
})

socialRouter.patch('/casas/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const { ponto, ...dados } = validarParcial(casaBase, req.body)
  await carregarCasa(id)
  const [atualizada] = await db
    .update(casas)
    .set({ ...dados, ...pontoParaColunas(ponto) })
    .where(eq(casas.id, id))
    .returning()
  const fams = await db.select().from(familias).where(eq(familias.casaId, id))
  await auditar(eu(req).id, 'ALTERAR', 'casa', id, { campos: Object.keys(req.body ?? {}) })
  res.json(serializarCasa(atualizada, fams))
})

socialRouter.delete('/casas/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  await carregarCasa(id)
  // As famílias continuam cadastradas, só perdem o vínculo (FK ON DELETE SET NULL).
  await db.delete(casas).where(eq(casas.id, id))
  await auditar(eu(req).id, 'EXCLUIR', 'casa', id)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Famílias
// ---------------------------------------------------------------------------

const membroSchema = z.object({
  id: z.string().max(60).optional(),
  nome: textoObrigatorio(120),
  nascimento: z
    .string()
    .refine((s) => !s || !Number.isNaN(new Date(s).getTime()), 'Data de nascimento inválida.')
    .refine((s) => !s || new Date(s) <= new Date(), 'Data de nascimento no futuro.')
    .default(''),
  parentesco: z.enum(PARENTESCOS),
  escolaridade: z.enum(ESCOLARIDADES),
  estuda: z.boolean().default(false),
  trabalha: z.boolean().default(false),
  pcd: z.boolean().default(false),
  doencaCronica: z.boolean().default(false),
  gestante: z.boolean().default(false),
})

export const familiaBase = z.object({
  nomeFamilia: textoObrigatorio(120),
  casaId: z.uuid('Casa inválida.').nullish(),
  responsavel: textoObrigatorio(120),
  telefone: texto(30).default(''),
  nis: z.string().default('').transform(soDigitos),
  rendaMensal: z.number().min(0, 'Renda não pode ser negativa.').max(1_000_000).default(0),
  beneficios: z.array(z.enum(BENEFICIOS)).max(BENEFICIOS.length).default([]),
  membros: z.array(membroSchema).max(30).default([]),
  observacoes: texto(2000).default(''),
})

type FamiliaEntrada = Partial<z.infer<typeof familiaBase>>

async function aplicarRegrasFamilia(d: FamiliaEntrada) {
  if (d.nis && !nisValido(d.nis)) throw regraNegocio('NIS inválido.')

  if (d.membros) {
    const responsaveis = d.membros.filter((m) => m.parentesco === 'Responsável').length
    if (responsaveis > 1) throw regraNegocio('A família deve ter apenas um membro como "Responsável".')
    // Garante id estável para cada membro (o app usa para editar/remover).
    d.membros = d.membros.map((m) => ({ ...m, id: m.id || crypto.randomUUID() }))
  }

  if (d.beneficios && d.beneficios.includes('Nenhum') && d.beneficios.length > 1) {
    throw regraNegocio('"Nenhum" não pode ser combinado com outros benefícios.')
  }

  if (d.casaId) await carregarCasa(d.casaId)
}

function serializarFamilia(f: Familia, casa?: Casa | null) {
  const indice = indiceVulnerabilidade(f, casa)
  const pessoas = Math.max(f.membros.length, 1)
  return {
    ...f,
    rendaPerCapita: Math.round((f.rendaMensal / pessoas) * 100) / 100,
    indiceVulnerabilidade: indice,
    faixaVulnerabilidade: faixaVulnerabilidade(indice),
  }
}

async function familiaSerializada(id: string) {
  const [linha] = await db
    .select({ f: familias, c: casas })
    .from(familias)
    .leftJoin(casas, eq(casas.id, familias.casaId))
    .where(eq(familias.id, id))
  if (!linha) throw naoEncontrado('Família')
  return serializarFamilia(linha.f, linha.c)
}

socialRouter.get('/familias', async (req, res) => {
  const f = validar(
    z.object({
      ordenar: z.enum(['recentes', 'vulnerabilidade']).default('recentes'),
      faixa: z.enum(['Crítica', 'Alta', 'Média', 'Baixa']).optional(),
    }),
    req.query,
  )
  const linhas = await db
    .select({ f: familias, c: casas })
    .from(familias)
    .leftJoin(casas, eq(casas.id, familias.casaId))
    .orderBy(desc(familias.criadaEm))
  let lista = linhas.map(({ f, c }) => serializarFamilia(f, c))
  if (f.faixa) lista = lista.filter((x) => x.faixaVulnerabilidade === f.faixa)
  if (f.ordenar === 'vulnerabilidade') lista.sort((a, b) => b.indiceVulnerabilidade - a.indiceVulnerabilidade)
  res.json(lista)
})

socialRouter.get('/familias/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const familia = await familiaSerializada(id)
  await auditar(eu(req).id, 'VISUALIZAR', 'familia', id)
  res.json(familia)
})

socialRouter.post('/familias', async (req, res) => {
  const dados = validar(familiaBase, req.body)
  await aplicarRegrasFamilia(dados)
  const [nova] = await db
    .insert(familias)
    .values({ ...dados, casaId: dados.casaId ?? null, membros: dados.membros as Familia['membros'] })
    .returning()
  await auditar(eu(req).id, 'CRIAR', 'familia', nova.id)
  res.status(201).json(await familiaSerializada(nova.id))
})

socialRouter.patch('/familias/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const dados = validarParcial(familiaBase, req.body)
  await familiaSerializada(id)
  await aplicarRegrasFamilia(dados)
  await db
    .update(familias)
    .set({ ...dados, membros: dados.membros as Familia['membros'] | undefined })
    .where(eq(familias.id, id))
  await auditar(eu(req).id, 'ALTERAR', 'familia', id, { campos: Object.keys(dados) })
  res.json(await familiaSerializada(id))
})

socialRouter.delete('/familias/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  await familiaSerializada(id)
  await db.delete(familias).where(eq(familias.id, id))
  await auditar(eu(req).id, 'EXCLUIR', 'familia', id)
  res.status(204).end()
})
