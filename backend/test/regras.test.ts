import { describe, expect, it } from 'vitest'
import { cnpjValido, cpfValido, nisValido } from '../src/lib/documentos.js'
import { comprimentoMetros, distanciaMetros } from '../src/lib/geo.js'
import { faixaVulnerabilidade, indiceVulnerabilidade } from '../src/lib/vulnerabilidade.js'
import { gerarCpf } from './helpers.js'

// Testes unitários: funções puras, sem banco nem HTTP.

describe('documentos', () => {
  it('valida CPF pelos dígitos verificadores', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
    expect(cpfValido('52998224724')).toBe(false)
    expect(cpfValido('111.111.111-11')).toBe(false)
    expect(cpfValido('123')).toBe(false)
    expect(cpfValido(gerarCpf(42))).toBe(true)
  })

  it('valida CNPJ', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true)
    expect(cnpjValido('11.222.333/0001-80')).toBe(false)
    expect(cnpjValido('00000000000000')).toBe(false)
  })

  it('valida NIS', () => {
    expect(nisValido('120.47573.03-5')).toBe(true)
    expect(nisValido('12047573036')).toBe(false)
  })
})

describe('geo', () => {
  it('calcula distância aproximada', () => {
    // ~111 m por 0,001 grau de latitude
    const d = distanciaMetros({ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 })
    expect(d).toBeGreaterThan(110)
    expect(d).toBeLessThan(112)
  })

  it('soma os trechos da rota', () => {
    const pontos = [
      { lat: 0, lng: 0 },
      { lat: 0.001, lng: 0 },
      { lat: 0.002, lng: 0 },
    ]
    expect(Math.round(comprimentoMetros(pontos))).toBe(222)
  })
})

describe('índice de vulnerabilidade', () => {
  const membro = (extra: Record<string, unknown> = {}) => ({
    id: 'm',
    nome: 'X',
    nascimento: '1990-01-01',
    parentesco: 'Responsável',
    escolaridade: 'Médio completo',
    estuda: false,
    trabalha: true,
    pcd: false,
    doencaCronica: false,
    gestante: false,
    ...extra,
  })

  it('família com renda alta e casa estruturada tem índice baixo', () => {
    const i = indiceVulnerabilidade(
      { rendaMensal: 6000, membros: [membro(), membro({ parentesco: 'Cônjuge' })] },
      {
        aguaEncanada: true,
        esgoto: true,
        energiaEletrica: true,
        coletaLixo: true,
        tipoConstrucao: 'Alvenaria',
        riscos: [],
        comodos: 5,
      },
    )
    expect(i).toBe(0)
    expect(faixaVulnerabilidade(i)).toBe('Baixa')
  })

  it('renda per capita baixa + criança fora da escola + casa precária é crítica', () => {
    const anoCrianca = new Date().getFullYear() - 10
    const i = indiceVulnerabilidade(
      {
        rendaMensal: 200,
        membros: [
          membro({ trabalha: false }),
          membro({ parentesco: 'Filho(a)', nascimento: `${anoCrianca}-05-01`, trabalha: false }),
          membro({ parentesco: 'Filho(a)', nascimento: `${anoCrianca}-05-01`, trabalha: false, pcd: true }),
        ],
      },
      {
        aguaEncanada: false,
        esgoto: false,
        energiaEletrica: true,
        coletaLixo: false,
        tipoConstrucao: 'Improvisada',
        riscos: ['Alagamento', 'Deslizamento'],
        comodos: 1,
      },
    )
    expect(i).toBeGreaterThanOrEqual(70)
    expect(faixaVulnerabilidade(i)).toBe('Crítica')
  })

  it('nunca passa de 100', () => {
    const i = indiceVulnerabilidade(
      {
        rendaMensal: 0,
        membros: [
          membro({ trabalha: false, pcd: true, gestante: true, doencaCronica: true, nascimento: '1940-01-01' }),
          membro({ nascimento: `${new Date().getFullYear() - 2}-01-01`, trabalha: false }),
          membro({ nascimento: `${new Date().getFullYear() - 12}-01-01`, trabalha: false }),
        ],
      },
      {
        aguaEncanada: false,
        esgoto: false,
        energiaEletrica: false,
        coletaLixo: false,
        tipoConstrucao: 'Improvisada',
        riscos: ['Alagamento', 'Deslizamento', 'Incêndio', 'Estrutural'],
        comodos: 1,
      },
    )
    expect(i).toBe(100)
  })
})
