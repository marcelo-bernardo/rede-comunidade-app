import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

/**
 * Endereço da API. Ordem de prioridade:
 * 1. EXPO_PUBLIC_API_URL (arquivo .env do app ou variável no EAS Build)
 * 2. Em desenvolvimento: mesmo IP da máquina que roda o Expo, porta 3333 —
 *    assim o Expo Go no celular encontra a API sem configuração.
 */
function descobrirBaseUrl(): string {
  const doEnv = process.env.EXPO_PUBLIC_API_URL
  if (doEnv) return doEnv.replace(/\/$/, '')
  const host = Constants.expoConfig?.hostUri?.split(':')[0]
  return `http://${host ?? 'localhost'}:3333`
}

export const API_URL = descobrirBaseUrl()

const CHAVE_ACCESS = 'rede-comunidade:access'
const CHAVE_REFRESH = 'rede-comunidade:refresh'

export class ErroApi extends Error {
  constructor(
    message: string,
    public status: number,
    public codigo?: string,
    public detalhes?: unknown,
  ) {
    super(message)
  }
}

let accessToken: string | null = null
let aoExpirarSessao: (() => void) | null = null

/** Chamado quando o refresh token também expira — o AuthStore faz logout. */
export function definirAoExpirarSessao(fn: () => void) {
  aoExpirarSessao = fn
}

export async function salvarSessao(access: string, refresh: string) {
  accessToken = access
  await AsyncStorage.multiSet([
    [CHAVE_ACCESS, access],
    [CHAVE_REFRESH, refresh],
  ])
}

export async function limparSessao() {
  accessToken = null
  await AsyncStorage.multiRemove([CHAVE_ACCESS, CHAVE_REFRESH])
}

export async function temSessaoSalva() {
  accessToken = await AsyncStorage.getItem(CHAVE_ACCESS)
  return !!(await AsyncStorage.getItem(CHAVE_REFRESH))
}

export const lerRefreshToken = () => AsyncStorage.getItem(CHAVE_REFRESH)

// Garante um único refresh em andamento mesmo com várias requisições em paralelo.
let renovando: Promise<boolean> | null = null

async function renovarSessao(): Promise<boolean> {
  renovando ??= (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem(CHAVE_REFRESH)
      if (!refreshToken) return false
      const r = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!r.ok) return false
      const dados = await r.json()
      await salvarSessao(dados.accessToken, dados.refreshToken)
      return true
    } catch {
      return false
    } finally {
      setTimeout(() => (renovando = null), 0)
    }
  })()
  return renovando
}

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE'

async function requisicao<T>(metodo: Metodo, caminho: string, corpo?: unknown, tentarRenovar = true): Promise<T> {
  let r: Response
  try {
    r = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    })
  } catch {
    throw new ErroApi(`Sem conexão com o servidor (${API_URL}). Verifique sua internet.`, 0, 'SEM_CONEXAO')
  }

  if (r.status === 401 && tentarRenovar && !caminho.startsWith('/auth/login')) {
    if (await renovarSessao()) return requisicao<T>(metodo, caminho, corpo, false)
    await limparSessao()
    aoExpirarSessao?.()
  }

  if (r.status === 204) return undefined as T
  const dados = await r.json().catch(() => ({}))
  if (!r.ok) {
    throw new ErroApi(dados.erro ?? `Erro ${r.status}`, r.status, dados.codigo, dados.detalhes)
  }
  return dados as T
}

export const api = {
  get: <T>(caminho: string) => requisicao<T>('GET', caminho),
  post: <T>(caminho: string, corpo?: unknown) => requisicao<T>('POST', caminho, corpo ?? {}),
  patch: <T>(caminho: string, corpo: unknown) => requisicao<T>('PATCH', caminho, corpo),
  delete: <T = void>(caminho: string, corpo?: unknown) => requisicao<T>('DELETE', caminho, corpo),
}
