import { beforeAll, describe, expect, it } from 'vitest'
import { caixaDeSaida } from '../src/lib/email.js'
import { api, criarAdmin, dadosRegistro, login, prepararBanco, type Sessao } from './helpers.js'

let admin: Sessao

beforeAll(async () => {
  await prepararBanco()
  admin = await criarAdmin()
})

describe('cadastro', () => {
  it('cria usuário PENDENTE e nunca devolve o hash da senha', async () => {
    const r = await api().post('/auth/registrar').send(dadosRegistro()).expect(201)
    expect(r.body.usuario.status).toBe('PENDENTE')
    expect(r.body.usuario.perfil).toBe('MORADOR')
    expect(r.body.usuario.senhaHash).toBeUndefined()
  })

  it('ignora tentativa de se cadastrar já como ADMIN aprovado', async () => {
    const r = await api()
      .post('/auth/registrar')
      .send({ ...dadosRegistro(), perfil: 'ADMIN', status: 'APROVADO' })
      .expect(201)
    expect(r.body.usuario.perfil).toBe('MORADOR')
    expect(r.body.usuario.status).toBe('PENDENTE')
  })

  it('rejeita CPF inválido', async () => {
    const r = await api()
      .post('/auth/registrar')
      .send({ ...dadosRegistro(), cpf: '123.456.789-00' })
      .expect(400)
    expect(r.body.erro).toMatch(/CPF inválido/)
  })

  it('rejeita CPF e e-mail duplicados', async () => {
    const d = dadosRegistro()
    await api().post('/auth/registrar').send(d).expect(201)
    const cpfRepetido = await api()
      .post('/auth/registrar')
      .send({ ...dadosRegistro(), cpf: d.cpf })
      .expect(409)
    expect(cpfRepetido.body.erro).toMatch(/CPF/)
    const emailRepetido = await api()
      .post('/auth/registrar')
      .send({ ...dadosRegistro(), email: d.email.toUpperCase() })
      .expect(409)
    expect(emailRepetido.body.erro).toMatch(/e-mail/)
  })
})

describe('login e aprovação', () => {
  it('fluxo completo: pendente não entra → aprovado entra por e-mail e CPF', async () => {
    const d = dadosRegistro()
    const { body } = await api().post('/auth/registrar').send(d).expect(201)

    const pendente = await api().post('/auth/login').send({ identificador: d.email, senha: d.senha }).expect(403)
    expect(pendente.body.codigo).toBe('CADASTRO_PENDENTE')

    await api().post(`/usuarios/${body.usuario.id}/aprovar`).set(...admin.auth).expect(200)

    await login(d.email, d.senha)
    const porCpf = await login(d.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'), d.senha)
    const me = await api().get('/auth/me').set(...porCpf.auth).expect(200)
    expect(me.body.email).toBe(d.email)
  })

  it('mesma mensagem para usuário inexistente e senha errada', async () => {
    const d = dadosRegistro()
    await api().post('/auth/registrar').send(d)
    const a = await api().post('/auth/login').send({ identificador: 'nao@existe.com', senha: 'x' }).expect(401)
    const b = await api().post('/auth/login').send({ identificador: d.email, senha: 'errada' }).expect(401)
    expect(a.body.erro).toBe(b.body.erro)
  })

  it('morador não acessa rotas de administração', async () => {
    const d = dadosRegistro()
    const { body } = await api().post('/auth/registrar').send(d)
    await api().post(`/usuarios/${body.usuario.id}/aprovar`).set(...admin.auth)
    const morador = await login(d.email, d.senha)
    await api().get('/usuarios').set(...morador.auth).expect(403)
    await api().post(`/usuarios/${body.usuario.id}/aprovar`).set(...morador.auth).expect(403)
  })

  it('recusar corta o acesso imediatamente, mesmo com token válido', async () => {
    const d = dadosRegistro()
    const { body } = await api().post('/auth/registrar').send(d)
    await api().post(`/usuarios/${body.usuario.id}/aprovar`).set(...admin.auth)
    const morador = await login(d.email, d.senha)
    await api().get('/rotas').set(...morador.auth).expect(200)

    await api()
      .post(`/usuarios/${body.usuario.id}/recusar`)
      .set(...admin.auth)
      .send({ motivo: 'Não mora na comunidade' })
      .expect(200)

    await api().get('/rotas').set(...morador.auth).expect(401)
    await api().post('/auth/refresh').send({ refreshToken: morador.refreshToken }).expect(401)
    const r = await api().post('/auth/login').send({ identificador: d.email, senha: d.senha }).expect(403)
    expect(r.body.erro).toMatch(/Não mora na comunidade/)
  })

  it('não permite remover o último administrador', async () => {
    const r = await api().patch(`/usuarios/${admin.id}/perfil`).set(...admin.auth).send({ perfil: 'MORADOR' })
    expect(r.status).toBe(422)
  })
})

describe('refresh token', () => {
  it('rotaciona e detecta reuso de token antigo', async () => {
    const d = dadosRegistro()
    const { body } = await api().post('/auth/registrar').send(d)
    await api().post(`/usuarios/${body.usuario.id}/aprovar`).set(...admin.auth)
    const s = await login(d.email, d.senha)

    const r1 = await api().post('/auth/refresh').send({ refreshToken: s.refreshToken }).expect(200)
    expect(r1.body.refreshToken).not.toBe(s.refreshToken)

    // Reapresentar o token antigo derruba todas as sessões (inclusive a nova).
    await api().post('/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401)
    await api().post('/auth/refresh').send({ refreshToken: r1.body.refreshToken }).expect(401)
  })
})

describe('recuperação de senha', () => {
  it('envia token por e-mail e permite redefinir uma única vez', async () => {
    const d = dadosRegistro()
    const { body } = await api().post('/auth/registrar').send(d)
    await api().post(`/usuarios/${body.usuario.id}/aprovar`).set(...admin.auth)

    await api().post('/auth/esqueci-senha').send({ email: d.email }).expect(200)
    const email = caixaDeSaida.findLast((e) => e.para === d.email)!
    const token = email.texto.match(/Código: (\S+)/)![1]

    await api().post('/auth/redefinir-senha').send({ token, novaSenha: 'nova-senha-123' }).expect(200)
    await api().post('/auth/redefinir-senha').send({ token, novaSenha: 'outra-senha' }).expect(422)

    await login(d.email, 'nova-senha-123')
    await api().post('/auth/login').send({ identificador: d.email, senha: d.senha }).expect(401)
  })

  it('não revela se o e-mail existe', async () => {
    const a = await api().post('/auth/esqueci-senha').send({ email: 'ninguem@teste.com' }).expect(200)
    expect(a.body.mensagem).toMatch(/Se o e-mail/)
  })
})
