import { beforeAll, describe, expect, it } from 'vitest'
import { api, criarAdmin, criarMorador, prepararBanco, rotaValida, type Sessao } from './helpers.js'

let admin: Sessao
let autora: Sessao
let vizinhos: Sessao[]

beforeAll(async () => {
  await prepararBanco()
  admin = await criarAdmin()
  autora = await criarMorador(admin)
  vizinhos = [await criarMorador(admin), await criarMorador(admin), await criarMorador(admin)]
})

describe('rotas', () => {
  it('nasce pendente com autor vindo do token', async () => {
    const r = await api()
      .post('/rotas')
      .set(...autora.auth)
      .send({ ...rotaValida, status: 'validada', autorId: admin.id })
      .expect(201)
    expect(r.body.status).toBe('pendente')
    expect(r.body.autorId).toBe(autora.id)
    expect(r.body.comprimentoMetros).toBeGreaterThan(0)
  })

  it('exige ao menos 2 pontos e tipo válido', async () => {
    await api().post('/rotas').set(...autora.auth).send({ ...rotaValida, pontos: [rotaValida.pontos[0]] }).expect(400)
    await api().post('/rotas').set(...autora.auth).send({ ...rotaValida, tipo: 'Teleporte' }).expect(400)
  })

  it('validação comunitária: 3 confirmações validam, desconfirmar volta a pendente', async () => {
    const { body: rota } = await api().post('/rotas').set(...autora.auth).send(rotaValida).expect(201)

    // Autora não pode confirmar a própria rota
    await api().post(`/rotas/${rota.id}/confirmacao`).set(...autora.auth).expect(422)

    for (const v of vizinhos.slice(0, 2)) {
      const r = await api().post(`/rotas/${rota.id}/confirmacao`).set(...v.auth).expect(200)
      expect(r.body.status).toBe('pendente')
    }
    // Confirmar duas vezes não conta em dobro
    const dup = await api().post(`/rotas/${rota.id}/confirmacao`).set(...vizinhos[0].auth).expect(200)
    expect(dup.body.confirmacoes).toHaveLength(2)

    const validada = await api().post(`/rotas/${rota.id}/confirmacao`).set(...vizinhos[2].auth).expect(200)
    expect(validada.body.status).toBe('validada')
    expect(validada.body.confirmacoes).toHaveLength(3)

    const voltou = await api().delete(`/rotas/${rota.id}/confirmacao`).set(...vizinhos[2].auth).expect(200)
    expect(voltou.body.status).toBe('pendente')
  })

  it('alterar o traçado zera as confirmações; alterar só o nome não', async () => {
    const { body: rota } = await api().post('/rotas').set(...autora.auth).send(rotaValida)
    for (const v of vizinhos) await api().post(`/rotas/${rota.id}/confirmacao`).set(...v.auth)

    const renomeada = await api().patch(`/rotas/${rota.id}`).set(...autora.auth).send({ nome: 'Novo nome' }).expect(200)
    expect(renomeada.body.status).toBe('validada')
    expect(renomeada.body.tipo).toBe(rotaValida.tipo) // PATCH parcial não sobrescreve outros campos

    const novoTracado = await api()
      .patch(`/rotas/${rota.id}`)
      .set(...autora.auth)
      .send({ pontos: [...rotaValida.pontos, { lat: -23.502, lng: -46.629 }] })
      .expect(200)
    expect(novoTracado.body.status).toBe('pendente')
    expect(novoTracado.body.confirmacoes).toHaveLength(0)
  })

  it('só autor ou admin editam/excluem; recusada pela diretoria não é validada por confirmações', async () => {
    const { body: rota } = await api().post('/rotas').set(...autora.auth).send(rotaValida)
    await api().delete(`/rotas/${rota.id}`).set(...vizinhos[0].auth).expect(403)
    await api().patch(`/rotas/${rota.id}/status`).set(...autora.auth).send({ status: 'recusada' }).expect(403)
    await api().patch(`/rotas/${rota.id}/status`).set(...admin.auth).send({ status: 'recusada' }).expect(200)
    await api().post(`/rotas/${rota.id}/confirmacao`).set(...vizinhos[0].auth).expect(422)
    await api().delete(`/rotas/${rota.id}`).set(...admin.auth).expect(204)
    await api().get(`/rotas/${rota.id}`).set(...admin.auth).expect(404)
  })
})

describe('alertas', () => {
  const alerta = { tipo: 'Alagamento', gravidade: 'Alta', descricao: 'Rua alaga', ponto: { lat: -23.5, lng: -46.63 } }

  it('bloqueia alerta duplicado a menos de 30 m e aponta o existente', async () => {
    const { body: original } = await api().post('/alertas').set(...autora.auth).send(alerta).expect(201)
    const dup = await api()
      .post('/alertas')
      .set(...vizinhos[0].auth)
      .send({ ...alerta, ponto: { lat: -23.50005, lng: -46.63 } }) // ~5 m
      .expect(409)
    expect(dup.body.detalhes.alertaExistenteId).toBe(original.id)

    // Outro tipo no mesmo lugar, ou mesmo tipo longe, pode.
    await api().post('/alertas').set(...vizinhos[0].auth).send({ ...alerta, tipo: 'Buraco na via' }).expect(201)
    await api().post('/alertas').set(...vizinhos[0].auth).send({ ...alerta, ponto: { lat: -23.51, lng: -46.63 } }).expect(201)
  })

  it('resolver libera novo alerta no mesmo ponto e impede confirmações', async () => {
    const ponto = { lat: -23.6, lng: -46.7 }
    const { body: a } = await api().post('/alertas').set(...autora.auth).send({ ...alerta, ponto }).expect(201)
    await api().post(`/alertas/${a.id}/resolver`).set(...vizinhos[1].auth).send({}).expect(403)
    const resolvido = await api().post(`/alertas/${a.id}/resolver`).set(...autora.auth).send({}).expect(200)
    expect(resolvido.body.resolvido).toBe(true)
    await api().post(`/alertas/${a.id}/confirmacao`).set(...vizinhos[1].auth).expect(422)
    await api().post('/alertas').set(...vizinhos[1].auth).send({ ...alerta, ponto }).expect(201)
  })

  it('lista abertos ordenados por prioridade (gravidade e confirmações)', async () => {
    const lista = await api().get('/alertas?resolvido=false').set(...autora.auth).expect(200)
    const prioridades = lista.body.map((a: { prioridade: number }) => a.prioridade)
    expect(prioridades).toEqual([...prioridades].sort((x, y) => y - x))
  })
})
