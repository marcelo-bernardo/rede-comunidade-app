import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { and, eq, gt, isNull, or } from 'drizzle-orm'
import { z } from 'zod'
import { env } from '../config/env.js'
import { db, schema } from '../db/client.js'
import { auditar } from '../lib/auditoria.js'
import { cpfValido, soDigitos } from '../lib/documentos.js'
import { ESCOLARIDADES } from '../lib/dominio.js'
import { conflito, ErroApi, naoAutenticado, regraNegocio } from '../lib/erros.js'
import { enviarEmail } from '../lib/email.js'
import {
  assinarAccessToken,
  conferirSenha,
  conferirSenhaFalsa,
  gerarHashSenha,
  gerarTokenOpaco,
  hashToken,
} from '../lib/seguranca.js'
import { autenticar, eu, validar, validarParcial, type UsuarioLogado } from '../middlewares/http.js'

const { usuarios, refreshTokens, resetsSenha } = schema

const senha = z
  .string()
  .min(6, 'A senha deve ter pelo menos 6 caracteres.')
  .max(128, 'A senha é longa demais.')

const registroSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome completo.').max(120),
  email: z.email('E-mail inválido.').trim().toLowerCase(),
  cpf: z.string().transform(soDigitos).refine(cpfValido, 'CPF inválido.'),
  telefone: z.string().trim().max(30).default(''),
  rua: z.string().trim().min(1, 'Informe a rua onde mora.').max(200),
  senha,
  composicaoFamiliar: z
    .array(
      z.object({
        nome: z.string().trim().min(1).max(120),
        idade: z.number().int().min(0).max(130),
        escolaridade: z.enum(ESCOLARIDADES).or(z.string().max(60)),
      }),
    )
    .max(30)
    .default([]),
})

const loginSchema = z.object({
  identificador: z.string().trim().min(1, 'Informe CPF ou e-mail.'),
  senha: z.string().min(1, 'Informe a senha.'),
})

const perfilSchema = z.object({
  nome: z.string().trim().min(3).max(120),
  telefone: z.string().trim().max(30),
  rua: z.string().trim().min(1).max(200),
})

/** Dados do usuário que podem sair da API (nunca o hash da senha). */
export function usuarioPublico(u: UsuarioLogado) {
  const { senhaHash: _s, ...resto } = u
  return resto
}

async function emitirSessao(u: UsuarioLogado) {
  const { token, hash } = gerarTokenOpaco()
  const expiraEm = new Date(Date.now() + env.REFRESH_TOKEN_DIAS * 24 * 60 * 60 * 1000)
  await db.insert(refreshTokens).values({ usuarioId: u.id, tokenHash: hash, expiraEm })
  return {
    accessToken: assinarAccessToken({ sub: u.id, perfil: u.perfil }),
    refreshToken: token,
    usuario: usuarioPublico(u),
  }
}

function barrarSeNaoAprovado(u: UsuarioLogado) {
  if (u.status === 'PENDENTE') {
    throw new ErroApi(
      403,
      'Seu cadastro ainda está em análise pela Presidente. Aguarde a aprovação.',
      'CADASTRO_PENDENTE',
    )
  }
  if (u.status === 'REJEITADO') {
    const motivo = u.motivoRecusa ? ` Motivo: ${u.motivoRecusa}` : ''
    throw new ErroApi(
      403,
      `Seu cadastro foi recusado. Entre em contato com a diretoria.${motivo}`,
      'CADASTRO_REJEITADO',
    )
  }
}

export const authRouter = Router()

// Limita tentativas de login/cadastro/reset por IP (força bruta).
authRouter.use(
  ['/login', '/registrar', '/esqueci-senha', '/redefinir-senha'],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.NODE_ENV === 'test' ? 1000 : 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas. Aguarde alguns minutos.', codigo: 'LIMITE' },
  }),
)

authRouter.post('/registrar', async (req, res) => {
  const dados = validar(registroSchema, req.body)

  const [existente] = await db
    .select({ email: usuarios.email, cpf: usuarios.cpf })
    .from(usuarios)
    .where(or(eq(usuarios.email, dados.email), eq(usuarios.cpf, dados.cpf)))
  if (existente?.cpf === dados.cpf) throw conflito('Já existe uma conta com este CPF.')
  if (existente) throw conflito('Já existe uma conta com este e-mail.')

  const [novo] = await db
    .insert(usuarios)
    .values({
      nome: dados.nome,
      email: dados.email,
      cpf: dados.cpf,
      telefone: dados.telefone,
      rua: dados.rua,
      composicaoFamiliar: dados.composicaoFamiliar,
      senhaHash: await gerarHashSenha(dados.senha),
      // Regra: todo cadastro nasce PENDENTE e como MORADOR, independentemente
      // do que o cliente enviar. Só um ADMIN aprova ou promove.
      perfil: 'MORADOR',
      status: 'PENDENTE',
    })
    .returning()

  await auditar(novo.id, 'REGISTRO', 'usuario', novo.id)
  res.status(201).json({
    usuario: usuarioPublico(novo),
    mensagem: 'Cadastro recebido! Aguarde a aprovação da diretoria.',
  })
})

authRouter.post('/login', async (req, res) => {
  const { identificador, senha } = validar(loginSchema, req.body)

  const porEmail = identificador.includes('@')
  const [u] = await db
    .select()
    .from(usuarios)
    .where(
      porEmail ? eq(usuarios.email, identificador.toLowerCase()) : eq(usuarios.cpf, soDigitos(identificador)),
    )

  // Mensagem única para "não existe" e "senha errada": não revela quem tem conta.
  const erroCredencial = naoAutenticado('CPF/e-mail ou senha incorretos.')
  if (!u) {
    await conferirSenhaFalsa(senha)
    throw erroCredencial
  }
  if (!(await conferirSenha(senha, u.senhaHash))) throw erroCredencial

  barrarSeNaoAprovado(u)
  res.json(await emitirSessao(u))
})

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = validar(z.object({ refreshToken: z.string().min(10) }), req.body)
  const hash = hashToken(refreshToken)

  const [registro] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash))
  if (!registro || registro.expiraEm < new Date()) throw naoAutenticado()

  if (registro.revogadoEm) {
    // Token já usado sendo reapresentado = possível roubo. Derruba todas as sessões.
    await db
      .update(refreshTokens)
      .set({ revogadoEm: new Date() })
      .where(and(eq(refreshTokens.usuarioId, registro.usuarioId), isNull(refreshTokens.revogadoEm)))
    throw naoAutenticado()
  }

  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, registro.usuarioId))
  if (!u || u.status !== 'APROVADO') throw naoAutenticado('Acesso não autorizado.')

  // Rotação: cada refresh token vale uma única vez.
  await db.update(refreshTokens).set({ revogadoEm: new Date() }).where(eq(refreshTokens.id, registro.id))
  res.json(await emitirSessao(u))
})

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = validar(z.object({ refreshToken: z.string().optional() }), req.body ?? {})
  if (refreshToken) {
    await db
      .update(refreshTokens)
      .set({ revogadoEm: new Date() })
      .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)))
  }
  res.status(204).end()
})

authRouter.post('/esqueci-senha', async (req, res) => {
  const { email } = validar(z.object({ email: z.email('E-mail inválido.').trim().toLowerCase() }), req.body)
  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email))

  if (u) {
    const { token, hash } = gerarTokenOpaco()
    await db.insert(resetsSenha).values({
      usuarioId: u.id,
      tokenHash: hash,
      expiraEm: new Date(Date.now() + 60 * 60 * 1000),
    })
    const link = env.RESET_SENHA_URL.replace('{token}', token)
    await enviarEmail(
      u.email,
      'Redefinição de senha — Rede Comunidade',
      `Olá, ${u.nome}!\n\nPara criar uma nova senha, acesse:\n${link}\n\nCódigo: ${token}\n\nO link vale por 1 hora. Se não foi você, ignore este e-mail.`,
    )
  }
  // Mesma resposta sempre, exista ou não a conta.
  res.json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções em instantes.' })
})

authRouter.post('/redefinir-senha', async (req, res) => {
  const { token, novaSenha } = validar(z.object({ token: z.string().min(10), novaSenha: senha }), req.body)

  const [reset] = await db
    .select()
    .from(resetsSenha)
    .where(
      and(
        eq(resetsSenha.tokenHash, hashToken(token)),
        isNull(resetsSenha.usadoEm),
        gt(resetsSenha.expiraEm, new Date()),
      ),
    )
  if (!reset) throw regraNegocio('Link de redefinição inválido ou expirado. Peça um novo.')

  await db.transaction(async (tx) => {
    await tx.update(resetsSenha).set({ usadoEm: new Date() }).where(eq(resetsSenha.id, reset.id))
    await tx
      .update(usuarios)
      .set({ senhaHash: await gerarHashSenha(novaSenha) })
      .where(eq(usuarios.id, reset.usuarioId))
    // Troca de senha encerra as sessões abertas em outros aparelhos.
    await tx
      .update(refreshTokens)
      .set({ revogadoEm: new Date() })
      .where(and(eq(refreshTokens.usuarioId, reset.usuarioId), isNull(refreshTokens.revogadoEm)))
  })
  await auditar(reset.usuarioId, 'REDEFINIR_SENHA', 'usuario', reset.usuarioId)
  res.json({ mensagem: 'Senha redefinida. Faça login com a nova senha.' })
})

authRouter.get('/me', autenticar, (req, res) => {
  res.json(usuarioPublico(eu(req)))
})

authRouter.patch('/me', autenticar, async (req, res) => {
  const dados = validarParcial(perfilSchema, req.body)
  const [atualizado] = await db.update(usuarios).set(dados).where(eq(usuarios.id, eu(req).id)).returning()
  res.json(usuarioPublico(atualizado))
})

authRouter.post('/trocar-senha', autenticar, async (req, res) => {
  const { senhaAtual, novaSenha } = validar(
    z.object({ senhaAtual: z.string().min(1), novaSenha: senha }),
    req.body,
  )
  const u = eu(req)
  if (!(await conferirSenha(senhaAtual, u.senhaHash))) throw regraNegocio('Senha atual incorreta.')
  await db.update(usuarios).set({ senhaHash: await gerarHashSenha(novaSenha) }).where(eq(usuarios.id, u.id))
  res.json({ mensagem: 'Senha alterada.' })
})
