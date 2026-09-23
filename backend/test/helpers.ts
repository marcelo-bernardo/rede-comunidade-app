import request from 'supertest'
import { criarApp } from '../src/app.js'
import { db, migrar, schema } from '../src/db/client.js'
import { gerarHashSenha } from '../src/lib/seguranca.js'

export const app = criarApp()
export const api = () => request(app)

let preparado: Promise<void> | undefined
export const prepararBanco = () => (preparado ??= migrar())

/** Gera um CPF válido (dígitos verificadores corretos) a partir de uma semente. */
export function gerarCpf(semente: number): string {
  const base = String(100000000 + (semente * 7919) % 899999999).padStart(9, '0').slice(0, 9)
  const dv = (s: string, peso: number) => {
    let soma = 0
    for (let i = 0; i < s.length; i++) soma += Number(s[i]) * (peso - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  const d1 = dv(base, 10)
  const d2 = dv(base + d1, 11)
  return `${base}${d1}${d2}`
}

let contador = 1

export type Sessao = { id: string; token: string; refreshToken: string; auth: [string, string] }

/** Cria um admin direto no banco e faz login. */
export async function criarAdmin(): Promise<Sessao> {
  const n = contador++
  const email = `admin${n}@teste.com`
  await db.insert(schema.usuarios).values({
    nome: `Admin ${n}`,
    email,
    cpf: gerarCpf(9000 + n),
    senhaHash: await gerarHashSenha('senha-admin'),
    perfil: 'ADMIN',
    status: 'APROVADO',
  })
  return login(email, 'senha-admin')
}

export async function login(identificador: string, senha: string): Promise<Sessao> {
  const r = await api().post('/auth/login').send({ identificador, senha })
  if (r.status !== 200) throw new Error(`login falhou: ${r.status} ${JSON.stringify(r.body)}`)
  return {
    id: r.body.usuario.id,
    token: r.body.accessToken,
    refreshToken: r.body.refreshToken,
    auth: ['Authorization', `Bearer ${r.body.accessToken}`],
  }
}

export function dadosRegistro(n = contador++) {
  return {
    nome: `Morador ${n}`,
    email: `morador${n}@teste.com`,
    cpf: gerarCpf(n),
    telefone: '(11) 99999-0000',
    rua: 'Rua das Flores',
    senha: 'senha123',
  }
}

/** Registra um morador, aprova com o admin informado e faz login. */
export async function criarMorador(admin: Sessao): Promise<Sessao> {
  const dados = dadosRegistro()
  const r = await api().post('/auth/registrar').send(dados)
  if (r.status !== 201) throw new Error(`registro falhou: ${JSON.stringify(r.body)}`)
  await api().post(`/usuarios/${r.body.usuario.id}/aprovar`).set(...admin.auth).expect(200)
  return login(dados.email, dados.senha)
}

export const rotaValida = {
  nome: 'Beco da Escada',
  tipo: 'Caminho a pé',
  condicao: 'Regular',
  iluminacao: false,
  acessivel: false,
  descricao: 'Escadaria',
  pontos: [
    { lat: -23.5008, lng: -46.6305 },
    { lat: -23.5013, lng: -46.6297 },
  ],
}
