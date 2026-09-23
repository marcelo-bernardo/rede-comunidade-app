import { Router } from 'express'
import { and, desc, eq, ilike, lte, or, sql, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/client.js'
import { cnpjValido, soDigitos } from '../lib/documentos.js'
import {
  CATEGORIAS_COMERCIO,
  DISPONIBILIDADES,
  latLng,
  listaTags,
  texto,
  textoObrigatorio,
  UNIDADES_PRECO,
  uuidParam,
} from '../lib/dominio.js'
import { naoEncontrado, regraNegocio } from '../lib/erros.js'
import { autenticar, eu, exigirDonoOuAdmin, validar, validarParcial } from '../middlewares/http.js'

const { comercios, freelancers, usuarios } = schema

export const guiaRouter = Router()
guiaRouter.use(['/comercios', '/freelancers'], autenticar)

// ---------------------------------------------------------------------------
// Comércios
// ---------------------------------------------------------------------------

export const comercioBase = z.object({
  nome: textoObrigatorio(120),
  responsavel: texto(120).default(''),
  categoria: z.enum(CATEGORIAS_COMERCIO),
  descricao: texto(1000).default(''),
  telefone: texto(30).default(''),
  whatsapp: z.boolean().default(false),
  endereco: texto(200).default(''),
  horario: texto(120).default(''),
  formalizado: z.boolean().default(false),
  cnpjMei: z.string().default('').transform(soDigitos),
  aceitaFiado: z.boolean().default(false),
  entrega: z.boolean().default(false),
  ponto: latLng.nullish(),
  tags: listaTags.default([]),
})

/** Regra: negócio formalizado (MEI/empresa) precisa de CNPJ válido. */
function validarFormalizacao(d: { formalizado?: boolean; cnpjMei?: string }) {
  if (d.formalizado && !cnpjValido(d.cnpjMei ?? '')) {
    throw regraNegocio('Comércio formalizado precisa de um CNPJ/MEI válido.')
  }
  if (d.formalizado === false) d.cnpjMei = ''
}

const pontoParaColunas = (ponto: { lat: number; lng: number } | null | undefined) =>
  ponto === undefined ? {} : { lat: ponto?.lat ?? null, lng: ponto?.lng ?? null }

async function listarComercios(condicao?: SQL) {
  const linhas = await db
    .select({ c: comercios, autor: usuarios.nome })
    .from(comercios)
    .leftJoin(usuarios, eq(usuarios.id, comercios.autorId))
    .where(condicao)
    .orderBy(desc(comercios.criadoEm))
  return linhas.map(({ c: { lat, lng, ...c }, autor }) => ({
    ...c,
    ponto: lat != null && lng != null ? { lat, lng } : undefined,
    autor: autor ?? 'Morador removido',
  }))
}

async function carregarComercio(id: string) {
  const [c] = await db.select().from(comercios).where(eq(comercios.id, id))
  if (!c) throw naoEncontrado('Comércio')
  return c
}

guiaRouter.get('/comercios', async (req, res) => {
  const f = validar(
    z.object({
      categoria: z.enum(CATEGORIAS_COMERCIO).optional(),
      busca: z.string().trim().max(100).optional(),
      entrega: z.enum(['true']).optional(),
      aceitaFiado: z.enum(['true']).optional(),
    }),
    req.query,
  )
  const cond: SQL[] = []
  if (f.categoria) cond.push(eq(comercios.categoria, f.categoria))
  if (f.entrega) cond.push(eq(comercios.entrega, true))
  if (f.aceitaFiado) cond.push(eq(comercios.aceitaFiado, true))
  if (f.busca) {
    const t = `%${f.busca}%`
    cond.push(or(ilike(comercios.nome, t), ilike(comercios.descricao, t), sql`${comercios.tags}::text ilike ${t}`)!)
  }
  res.json(await listarComercios(cond.length ? and(...cond) : undefined))
})

guiaRouter.post('/comercios', async (req, res) => {
  const { ponto, ...dados } = validar(comercioBase, req.body)
  validarFormalizacao(dados)
  const [novo] = await db
    .insert(comercios)
    .values({ ...dados, ...pontoParaColunas(ponto), autorId: eu(req).id })
    .returning()
  res.status(201).json((await listarComercios(eq(comercios.id, novo.id)))[0])
})

guiaRouter.patch('/comercios/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const { ponto, ...dados } = validarParcial(comercioBase, req.body)
  const atual = await carregarComercio(id)
  exigirDonoOuAdmin(req, atual.autorId)
  const final = { formalizado: atual.formalizado, cnpjMei: atual.cnpjMei, ...dados }
  validarFormalizacao(final)
  await db
    .update(comercios)
    .set({ ...dados, cnpjMei: final.cnpjMei, ...pontoParaColunas(ponto) })
    .where(eq(comercios.id, id))
  res.json((await listarComercios(eq(comercios.id, id)))[0])
})

guiaRouter.delete('/comercios/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  exigirDonoOuAdmin(req, (await carregarComercio(id)).autorId)
  await db.delete(comercios).where(eq(comercios.id, id))
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Freelancers
// ---------------------------------------------------------------------------

export const freelancerBase = z.object({
  nome: textoObrigatorio(120),
  profissao: textoObrigatorio(80),
  descricao: texto(1000).default(''),
  telefone: texto(30).default(''),
  whatsapp: z.boolean().default(false),
  habilidades: listaTags.default([]),
  disponibilidade: z.array(z.enum(DISPONIBILIDADES)).max(5).default([]),
  precoMin: z.number().min(0, 'Preço não pode ser negativo.').max(1_000_000).default(0),
  precoMax: z.number().min(0, 'Preço não pode ser negativo.').max(1_000_000).default(0),
  unidadePreco: z.enum(UNIDADES_PRECO).default('serviço'),
  atendeDomicilio: z.boolean().default(false),
  temTransporte: z.boolean().default(false),
  bairro: texto(120).default(''),
})

function validarFaixaPreco(min: number, max: number) {
  if (max > 0 && min > max) throw regraNegocio('O preço mínimo não pode ser maior que o máximo.')
}

async function listarFreelancers(condicao?: SQL) {
  const linhas = await db
    .select({ f: freelancers, autor: usuarios.nome })
    .from(freelancers)
    .leftJoin(usuarios, eq(usuarios.id, freelancers.autorId))
    .where(condicao)
    .orderBy(desc(freelancers.criadoEm))
  return linhas.map(({ f, autor }) => ({ ...f, autor: autor ?? 'Morador removido' }))
}

async function carregarFreelancer(id: string) {
  const [f] = await db.select().from(freelancers).where(eq(freelancers.id, id))
  if (!f) throw naoEncontrado('Freelancer')
  return f
}

guiaRouter.get('/freelancers', async (req, res) => {
  const f = validar(
    z.object({
      busca: z.string().trim().max(100).optional(),
      habilidade: z.string().trim().max(40).optional(),
      disponibilidade: z.enum(DISPONIBILIDADES).optional(),
      precoAte: z.coerce.number().min(0).optional(),
    }),
    req.query,
  )
  const cond: SQL[] = []
  if (f.busca) {
    const t = `%${f.busca}%`
    cond.push(or(ilike(freelancers.nome, t), ilike(freelancers.profissao, t), ilike(freelancers.descricao, t))!)
  }
  if (f.habilidade) cond.push(sql`${freelancers.habilidades}::text ilike ${`%${f.habilidade}%`}`)
  if (f.disponibilidade) cond.push(sql`${freelancers.disponibilidade} @> ${JSON.stringify([f.disponibilidade])}::jsonb`)
  if (f.precoAte !== undefined) cond.push(lte(freelancers.precoMin, f.precoAte))
  res.json(await listarFreelancers(cond.length ? and(...cond) : undefined))
})

guiaRouter.post('/freelancers', async (req, res) => {
  const dados = validar(freelancerBase, req.body)
  validarFaixaPreco(dados.precoMin, dados.precoMax)
  const [novo] = await db.insert(freelancers).values({ ...dados, autorId: eu(req).id }).returning()
  res.status(201).json((await listarFreelancers(eq(freelancers.id, novo.id)))[0])
})

guiaRouter.patch('/freelancers/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const dados = validarParcial(freelancerBase, req.body)
  const atual = await carregarFreelancer(id)
  exigirDonoOuAdmin(req, atual.autorId)
  validarFaixaPreco(dados.precoMin ?? atual.precoMin, dados.precoMax ?? atual.precoMax)
  await db.update(freelancers).set(dados).where(eq(freelancers.id, id))
  res.json((await listarFreelancers(eq(freelancers.id, id)))[0])
})

guiaRouter.delete('/freelancers/:id', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  exigirDonoOuAdmin(req, (await carregarFreelancer(id)).autorId)
  await db.delete(freelancers).where(eq(freelancers.id, id))
  res.status(204).end()
})
