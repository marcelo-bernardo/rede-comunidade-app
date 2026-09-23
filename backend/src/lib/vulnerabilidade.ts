import type { Membro } from '../db/schema.js'

type FamiliaBase = { rendaMensal: number; membros: Membro[] }
type CasaBase = {
  aguaEncanada: boolean
  esgoto: boolean
  energiaEletrica: boolean
  coletaLixo: boolean
  tipoConstrucao: string
  riscos: string[]
  comodos: number
}

export function idade(nascimento: string, referencia = new Date()): number | null {
  if (!nascimento) return null
  const nasc = new Date(nascimento)
  if (Number.isNaN(nasc.getTime())) return null
  let anos = referencia.getFullYear() - nasc.getFullYear()
  const m = referencia.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && referencia.getDate() < nasc.getDate())) anos--
  return anos
}

/**
 * Índice de vulnerabilidade (0 a 100) — mesma regra usada no app. Combina renda
 * per capita, composição familiar e infraestrutura da casa. Calculado no
 * servidor para que o valor não possa ser adulterado pelo cliente.
 */
export function indiceVulnerabilidade(familia: FamiliaBase, casa?: CasaBase | null): number {
  let pontos = 0

  const pessoas = Math.max(familia.membros.length, 1)
  const perCapita = familia.rendaMensal / pessoas
  if (perCapita <= 109) pontos += 30
  else if (perCapita <= 218) pontos += 22
  else if (perCapita <= 706) pontos += 12
  else if (perCapita <= 1412) pontos += 5

  const anos = (m: Membro) => idade(m.nascimento) ?? 30
  if (familia.membros.some((m) => anos(m) < 6)) pontos += 8
  if (familia.membros.some((m) => anos(m) >= 60)) pontos += 6
  if (familia.membros.some((m) => m.pcd)) pontos += 8
  if (familia.membros.some((m) => m.gestante)) pontos += 6
  if (familia.membros.some((m) => m.doencaCronica)) pontos += 6
  if (familia.membros.some((m) => anos(m) >= 6 && anos(m) <= 17 && !m.estuda)) pontos += 8
  if (!familia.membros.some((m) => m.trabalha)) pontos += 6

  if (casa) {
    if (!casa.aguaEncanada) pontos += 7
    if (!casa.esgoto) pontos += 6
    if (!casa.energiaEletrica) pontos += 7
    if (!casa.coletaLixo) pontos += 4
    if (casa.tipoConstrucao === 'Improvisada') pontos += 8
    else if (casa.tipoConstrucao === 'Madeira') pontos += 3
    pontos += Math.min(casa.riscos.length * 4, 10)
    if (casa.comodos > 0 && pessoas / casa.comodos > 2) pontos += 5
  }

  return Math.min(Math.round(pontos), 100)
}

export type Faixa = 'Crítica' | 'Alta' | 'Média' | 'Baixa'

export function faixaVulnerabilidade(indice: number): Faixa {
  if (indice >= 70) return 'Crítica'
  if (indice >= 45) return 'Alta'
  if (indice >= 25) return 'Média'
  return 'Baixa'
}
