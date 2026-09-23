import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

const CUSTO_BCRYPT = env.NODE_ENV === 'test' ? 4 : 12

export const gerarHashSenha = (senha: string) => bcrypt.hash(senha, CUSTO_BCRYPT)
export const conferirSenha = (senha: string, hash: string) => bcrypt.compare(senha, hash)

// Hash fixo usado quando o usuário não existe, para que o tempo de resposta do
// login não revele se um e-mail/CPF está cadastrado.
const HASH_FALSO = bcrypt.hashSync('senha-inexistente', CUSTO_BCRYPT)
export const conferirSenhaFalsa = (senha: string) => bcrypt.compare(senha, HASH_FALSO)

export type PayloadAcesso = { sub: string; perfil: 'MORADOR' | 'ADMIN' }

export function assinarAccessToken(payload: PayloadAcesso): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
    issuer: 'rede-comunidade',
  })
}

export function verificarAccessToken(token: string): PayloadAcesso {
  return jwt.verify(token, env.JWT_SECRET, { issuer: 'rede-comunidade' }) as PayloadAcesso
}

/** Token opaco aleatório (refresh / reset de senha). Só o hash vai para o banco. */
export function gerarTokenOpaco(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex')
