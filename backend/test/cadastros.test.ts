import { beforeAll, describe, expect, it } from 'vitest'
import { api, criarAdmin, criarMorador, prepararBanco, type Sessao } from './helpers.js'

let admin: Sessao
let morador: Sessao
let outro: Sessao

beforeAll(async () => {
  await prepararBanco()
  admin = await criarAdmin()
  morador = await criarMorador(admin)
  outro = await criarMorador(admin)
})

describe('comércios', () => {
  const comercio = { nome: 'Mercadinho da Rita', categoria: 'Mercearia / Mercado', tags: ['pão', 'leite'] }

  it('formalizado exige CNPJ/MEI válido', async () => {
    await api().post('/comercios').set(...morador.auth).send({ ...comercio, formalizado: true }).expect(422)
    await api()
      .post('/comercios')
      .set(...morador.auth)
      .send({ ...comercio, formalizado: true, cnpjMei: '11.222.333/0001-80' })
      .expect(422)
    const ok = await api()
      .post('/comercios')
      .set(...morador.auth)
      .send({ ...comercio, formalizado: true, cnpjMei: '11.222.333/0001-81' })
      .expect(201)
    expect(ok.body.cnpjMei).toBe('11222333000181')
  })

  it('busca por tag e só o dono edita', async () => {
    const { body } = await api().post('/comercios').set(...morador.auth).send(comercio).expect(201)
    const busca = await api().get('/comercios?busca=leite').set(...outro.auth).expect(200)
    expect(busca.body.some((c: { id: string }) => c.id === body.id)).toBe(true)

    await api().patch(`/comercios/${body.id}`).set(...outro.auth).send({ nome: 'Hack' }).expect(403)
    const editado = await api().patch(`/comercios/${body.id}`).set(...morador.auth).send({ entrega: true }).expect(200)
    expect(editado.body.entrega).toBe(true)
    expect(editado.body.tags).toEqual(['pão', 'leite']) // não sobrescrito pelo PATCH
  })
})

describe('freelancers', () => {
  const free = {
    nome: 'Seu Jorge',
    profissao: 'Pedreiro',
    habilidades: ['alvenaria', 'reboco'],
    disponibilidade: ['Manhã', 'Fim de semana'],
    precoMin: 150,
    precoMax: 250,
    unidadePreco: 'diária',
  }

  it('preço mínimo não pode ser maior que o máximo', async () => {
    await api().post('/freelancers').set(...morador.auth).send({ ...free, precoMin: 300 }).expect(422)
  })

  it('filtra por habilidade, disponibilidade e preço', async () => {
    await api().post('/freelancers').set(...morador.auth).send(free).expect(201)
    const porHabilidade = await api().get('/freelancers?habilidade=reboco').set(...outro.auth).expect(200)
    expect(porHabilidade.body).toHaveLength(1)
    const porTurno = await api().get('/freelancers?disponibilidade=Noite').set(...outro.auth).expect(200)
    expect(porTurno.body).toHaveLength(0)
    const barato = await api().get('/freelancers?precoAte=100').set(...outro.auth).expect(200)
    expect(barato.body).toHaveLength(0)
  })
})

describe('casas e famílias (restrito à diretoria)', () => {
  const casa = {
    apelido: 'Casa azul',
    tipoConstrucao: 'Madeira',
    situacao: 'Cedida',
    comodos: 1,
    aguaEncanada: false,
    riscos: ['Alagamento'],
  }
  const membro = (extra = {}) => ({
    nome: 'Ana',
    nascimento: '1985-03-10',
    parentesco: 'Responsável',
    escolaridade: 'Médio completo',
    ...extra,
  })

  it('morador não acessa', async () => {
    await api().get('/familias').set(...morador.auth).expect(403)
    await api().post('/casas').set(...morador.auth).send(casa).expect(403)
  })

  it('calcula vulnerabilidade no servidor e aplica regras da família', async () => {
    const { body: c } = await api().post('/casas').set(...admin.auth).send(casa).expect(201)

    await api()
      .post('/familias')
      .set(...admin.auth)
      .send({ nomeFamilia: 'Silva', responsavel: 'Ana', casaId: c.id, membros: [membro(), membro({ nome: 'Bia' })] })
      .expect(422) // dois "Responsável"

    await api()
      .post('/familias')
      .set(...admin.auth)
      .send({ nomeFamilia: 'Silva', responsavel: 'Ana', nis: '12345678901', membros: [membro()] })
      .expect(422) // NIS inválido

    const { body: f } = await api()
      .post('/familias')
      .set(...admin.auth)
      .send({
        nomeFamilia: 'Silva',
        responsavel: 'Ana',
        casaId: c.id,
        rendaMensal: 300,
        nis: '120.47573.03-5',
        membros: [membro(), membro({ nome: 'Caio', parentesco: 'Filho(a)', nascimento: '2023-01-01' }), membro({ nome: 'Duda', parentesco: 'Filho(a)', nascimento: '2022-01-01' })],
        indiceVulnerabilidade: 0, // ignorado — calculado no servidor
      })
      .expect(201)
    expect(f.rendaPerCapita).toBe(100)
    expect(f.indiceVulnerabilidade).toBeGreaterThanOrEqual(70)
    expect(f.faixaVulnerabilidade).toBe('Crítica')
    expect(f.membros.every((m: { id: string }) => m.id)).toBe(true)

    const casas = await api().get('/casas').set(...admin.auth).expect(200)
    const minhaCasa = casas.body.find((x: { id: string }) => x.id === c.id)
    expect(minhaCasa.totalMoradores).toBe(3)
    expect(minhaCasa.superlotada).toBe(true)

    // Excluir a casa mantém a família, só desfaz o vínculo
    await api().delete(`/casas/${c.id}`).set(...admin.auth).expect(204)
    const depois = await api().get(`/familias/${f.id}`).set(...admin.auth).expect(200)
    expect(depois.body.casaId).toBeNull()
  })

  it('ordena por vulnerabilidade e registra auditoria', async () => {
    const lista = await api().get('/familias?ordenar=vulnerabilidade').set(...admin.auth).expect(200)
    const indices = lista.body.map((f: { indiceVulnerabilidade: number }) => f.indiceVulnerabilidade)
    expect(indices).toEqual([...indices].sort((a, b) => b - a))

    const log = await api().get('/admin/auditoria').set(...admin.auth).expect(200)
    expect(log.body.some((l: { acao: string; entidade: string }) => l.acao === 'CRIAR' && l.entidade === 'familia')).toBe(true)
  })
})

describe('administração', () => {
  it('carrega demo, mostra painel e exige confirmação para apagar tudo', async () => {
    const demo = await api().post('/admin/demo').set(...admin.auth).expect(200)
    expect(demo.body.totais.rotas).toBeGreaterThan(0)
    expect(demo.body.totais.familias).toBeGreaterThan(0)

    const painelAdmin = await api().get('/painel').set(...admin.auth).expect(200)
    expect(painelAdmin.body.familias.total).toBe(demo.body.totais.familias)
    const painelMorador = await api().get('/painel').set(...morador.auth).expect(200)
    expect(painelMorador.body.familias).toBeUndefined() // dados sociais só para admin

    await api().delete('/admin/dados').set(...admin.auth).send({}).expect(400)
    await api().delete('/admin/dados').set(...morador.auth).send({ confirmacao: 'APAGAR TUDO' }).expect(403)
    await api().delete('/admin/dados').set(...admin.auth).send({ confirmacao: 'APAGAR TUDO' }).expect(204)
    const vazio = await api().get('/painel').set(...admin.auth).expect(200)
    expect(vazio.body.rotas.total).toBe(0)
  })

  it('exportar → importar preserva os dados', async () => {
    await api().post('/admin/demo').set(...admin.auth).expect(200)
    const exp = await api().get('/admin/exportar').set(...admin.auth).expect(200)
    const imp = await api()
      .post('/admin/importar')
      .set(...admin.auth)
      .send({ dados: exp.body, substituir: true })
      .expect(200)
    expect(imp.body.totais.casas).toBe(exp.body.casas.length)
    const fams = await api().get('/familias').set(...admin.auth).expect(200)
    expect(fams.body.filter((f: { casaId: string | null }) => f.casaId).length).toBe(
      exp.body.familias.filter((f: { casaId: string | null }) => f.casaId).length,
    )
  })
})
