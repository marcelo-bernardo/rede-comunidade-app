import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/client.js'
import { ErroApi, naoAutenticado, proibido } from '../lib/erros.js'
import { verificarAccessToken } from '../lib/seguranca.js'

export type UsuarioLogado = typeof schema.usuarios.$inferSelect

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioLogado
    }
  }
}

/** Valida dados de entrada; lança 400 com a primeira mensagem legível. */
export function validar<T extends z.ZodType>(schemaZod: T, dados: unknown): z.infer<T> {
  const r = schemaZod.safeParse(dados)
  if (r.success) return r.data
  const primeiro = r.error.issues[0]
  const campo = primeiro.path.join('.')
  const msg = campo ? `${campo}: ${primeiro.message}` : primeiro.message
  throw new ErroApi(400, msg, 'DADOS_INVALIDOS', z.flattenError(r.error))
}

/**
 * Validação para PATCH: aceita qualquer subconjunto dos campos e devolve só os
 * que vieram no corpo. (No zod 4, `.default()` continua valendo dentro de
 * `.partial()`, então sem esse filtro campos omitidos seriam sobrescritos.)
 */
export function validarParcial<T extends z.ZodObject>(schemaZod: T, dados: unknown): Partial<z.infer<T>> {
  const corpo = (dados ?? {}) as Record<string, unknown>
  const r = validar(schemaZod.partial(), corpo) as Record<string, unknown>
  return Object.fromEntries(Object.entries(r).filter(([k]) => k in corpo)) as Partial<z.infer<T>>
}

/**
 * Exige Bearer token válido. O usuário é recarregado do banco a cada
 * requisição para que bloqueios/recusas tenham efeito imediato.
 */
export const autenticar: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization ?? ''
  const [tipo, token] = header.split(' ')
  if (tipo !== 'Bearer' || !token) throw naoAutenticado('Token de acesso ausente.')

  let sub: string
  try {
    sub = verificarAccessToken(token).sub
  } catch {
    throw naoAutenticado()
  }

  const [usuario] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, sub))
  if (!usuario || usuario.status !== 'APROVADO') throw naoAutenticado('Acesso não autorizado.')
  req.usuario = usuario
  next()
}

export const somenteAdmin: RequestHandler = (req, _res, next) => {
  if (req.usuario?.perfil !== 'ADMIN') throw proibido('Apenas a diretoria pode acessar este recurso.')
  next()
}

/** O usuário logado (garantido após `autenticar`). */
export function eu(req: Request): UsuarioLogado {
  if (!req.usuario) throw naoAutenticado()
  return req.usuario
}

/** Só o autor do registro ou um ADMIN podem alterá-lo. */
export function exigirDonoOuAdmin(req: Request, autorId: string | null) {
  const u = eu(req)
  if (u.perfil !== 'ADMIN' && u.id !== autorId) {
    throw proibido('Somente quem cadastrou ou a diretoria pode alterar este registro.')
  }
}

export const naoEncontrada: RequestHandler = (req, res) => {
  res.status(404).json({ erro: `Rota ${req.method} ${req.path} não existe.`, codigo: 'ROTA_INEXISTENTE' })
}

export const tratarErros: ErrorRequestHandler = (err, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ErroApi) {
    res.status(err.status).json({ erro: err.message, codigo: err.codigo, detalhes: err.detalhes })
    return
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ erro: 'JSON inválido no corpo da requisição.', codigo: 'JSON_INVALIDO' })
    return
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ erro: 'Requisição grande demais.', codigo: 'MUITO_GRANDE' })
    return
  }
  console.error(err)
  res.status(500).json({ erro: 'Erro interno. Tente novamente mais tarde.', codigo: 'ERRO_INTERNO' })
}
