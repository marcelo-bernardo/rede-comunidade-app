import { Router } from 'express'
import { and, count, desc, eq, ilike, isNull, or, type SQL } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/client.js'
import { auditar } from '../lib/auditoria.js'
import { uuidParam } from '../lib/dominio.js'
import { naoEncontrado, regraNegocio } from '../lib/erros.js'
import { autenticar, eu, somenteAdmin, validar } from '../middlewares/http.js'
import { usuarioPublico } from './auth.js'

const { usuarios, refreshTokens } = schema

export const usuariosRouter = Router()
usuariosRouter.use(autenticar, somenteAdmin)

const filtrosSchema = z.object({
  status: z.enum(['PENDENTE', 'APROVADO', 'REJEITADO']).optional(),
  perfil: z.enum(['MORADOR', 'ADMIN']).optional(),
  busca: z.string().trim().max(100).optional(),
})

usuariosRouter.get('/', async (req, res) => {
  const f = validar(filtrosSchema, req.query)
  const condicoes: SQL[] = []
  if (f.status) condicoes.push(eq(usuarios.status, f.status))
  if (f.perfil) condicoes.push(eq(usuarios.perfil, f.perfil))
  if (f.busca) {
    const termo = `%${f.busca}%`
    condicoes.push(
      or(ilike(usuarios.nome, termo), ilike(usuarios.email, termo), ilike(usuarios.cpf, termo), ilike(usuarios.rua, termo))!,
    )
  }
  const lista = await db
    .select()
    .from(usuarios)
    .where(condicoes.length ? and(...condicoes) : undefined)
    .orderBy(desc(usuarios.criadoEm))
  res.json(lista.map(usuarioPublico))
})

async function buscar(id: string) {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, id))
  if (!u) throw naoEncontrado('Usuário')
  return u
}

usuariosRouter.post('/:id/aprovar', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const alvo = await buscar(id)
  if (alvo.status === 'APROVADO') throw regraNegocio('Este cadastro já está aprovado.')

  const [atualizado] = await db
    .update(usuarios)
    .set({ status: 'APROVADO', motivoRecusa: null, avaliadoPor: eu(req).id, avaliadoEm: new Date() })
    .where(eq(usuarios.id, id))
    .returning()
  await auditar(eu(req).id, 'APROVAR_CADASTRO', 'usuario', id)
  res.json(usuarioPublico(atualizado))
})

usuariosRouter.post('/:id/recusar', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const { motivo } = validar(z.object({ motivo: z.string().trim().max(300).optional() }), req.body ?? {})
  if (id === eu(req).id) throw regraNegocio('Você não pode recusar o próprio cadastro.')
  const alvo = await buscar(id)
  if (alvo.perfil === 'ADMIN') throw regraNegocio('Rebaixe o perfil antes de recusar um administrador.')

  const [atualizado] = await db.transaction(async (tx) => {
    // Quem é recusado perde as sessões abertas na hora.
    await tx
      .update(refreshTokens)
      .set({ revogadoEm: new Date() })
      .where(and(eq(refreshTokens.usuarioId, id), isNull(refreshTokens.revogadoEm)))
    return tx
      .update(usuarios)
      .set({ status: 'REJEITADO', motivoRecusa: motivo ?? null, avaliadoPor: eu(req).id, avaliadoEm: new Date() })
      .where(eq(usuarios.id, id))
      .returning()
  })
  await auditar(eu(req).id, 'RECUSAR_CADASTRO', 'usuario', id, { motivo })
  res.json(usuarioPublico(atualizado))
})

usuariosRouter.patch('/:id/perfil', async (req, res) => {
  const { id } = validar(uuidParam, req.params)
  const { perfil } = validar(z.object({ perfil: z.enum(['MORADOR', 'ADMIN']) }), req.body)
  const alvo = await buscar(id)

  if (perfil === 'ADMIN' && alvo.status !== 'APROVADO') {
    throw regraNegocio('Só é possível promover moradores com cadastro aprovado.')
  }
  if (alvo.perfil === 'ADMIN' && perfil === 'MORADOR') {
    const [{ total }] = await db
      .select({ total: count() })
      .from(usuarios)
      .where(and(eq(usuarios.perfil, 'ADMIN'), eq(usuarios.status, 'APROVADO')))
    if (total <= 1) throw regraNegocio('A comunidade precisa de pelo menos um administrador.')
  }

  const [atualizado] = await db.update(usuarios).set({ perfil }).where(eq(usuarios.id, id)).returning()
  await auditar(eu(req).id, 'ALTERAR_PERFIL', 'usuario', id, { de: alvo.perfil, para: perfil })
  res.json(usuarioPublico(atualizado))
})
