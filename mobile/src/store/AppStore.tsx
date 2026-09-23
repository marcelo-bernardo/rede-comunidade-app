import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Alert, AppState } from 'react-native'
import { api, ErroApi } from '../lib/api'
import type { Alerta, Casa, Comercio, Estado, Familia, Freelancer, Rota } from '../lib/types'
import { useAuth } from './AuthStore'

/**
 * Estado compartilhado da comunidade, agora vindo da API. A interface é a
 * mesma do antigo armazenamento local; as funções de escrita chamam o
 * backend e atualizam a lista com o que ele devolve (já validado).
 */

const VAZIO: Estado = {
  usuario: '',
  rotas: [],
  alertas: [],
  comercios: [],
  freelancers: [],
  casas: [],
  familias: [],
}

type Novo<T> = Omit<T, 'id' | 'criadoEm' | 'criadaEm'>
type Colecao = Exclude<keyof Estado, 'usuario'>

type Contexto = {
  estado: Estado
  carregando: boolean
  recarregar: () => Promise<void>
  setUsuario: (nome: string) => void

  addRota: (dados: Novo<Rota>) => Promise<Rota | null>
  updateRota: (id: string, dados: Partial<Rota>) => Promise<Rota | null>
  removeRota: (id: string) => Promise<boolean>
  confirmarRota: (id: string) => Promise<void>

  addAlerta: (dados: Novo<Alerta>) => Promise<Alerta | null>
  updateAlerta: (id: string, dados: Partial<Alerta>) => Promise<Alerta | null>
  removeAlerta: (id: string) => Promise<boolean>
  confirmarAlerta: (id: string) => Promise<void>
  resolverAlerta: (id: string, resolvido?: boolean) => Promise<void>

  addComercio: (dados: Novo<Comercio>) => Promise<Comercio | null>
  updateComercio: (id: string, dados: Partial<Comercio>) => Promise<Comercio | null>
  removeComercio: (id: string) => Promise<boolean>

  addFreelancer: (dados: Novo<Freelancer>) => Promise<Freelancer | null>
  updateFreelancer: (id: string, dados: Partial<Freelancer>) => Promise<Freelancer | null>
  removeFreelancer: (id: string) => Promise<boolean>

  addCasa: (dados: Novo<Casa>) => Promise<Casa | null>
  updateCasa: (id: string, dados: Partial<Casa>) => Promise<Casa | null>
  removeCasa: (id: string) => Promise<boolean>

  addFamilia: (dados: Novo<Familia>) => Promise<Familia | null>
  updateFamilia: (id: string, dados: Partial<Familia>) => Promise<Familia | null>
  removeFamilia: (id: string) => Promise<boolean>

  restaurarDemo: () => Promise<void>
  limparTudo: () => Promise<void>
  exportarJson: () => string
  importarJson: (texto: string) => Promise<{ ok: boolean; erro?: string }>
}

const AppContext = createContext<Contexto | null>(null)

function mostrarErro(e: unknown) {
  Alert.alert('Não foi possível concluir', e instanceof ErroApi ? e.message : 'Erro inesperado.')
}

/** Remove campos que o servidor controla (id, autor, datas, calculados). */
function limpar<T extends object>(dados: T) {
  const {
    id: _id,
    autor: _a,
    autorId: _ai,
    criadoEm: _c,
    criadaEm: _cc,
    confirmacoes: _conf,
    status: _s,
    ...resto
  } = dados as Record<string, unknown>
  return resto
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { usuario, atualizarPerfil } = useAuth()
  const [estado, setEstado] = useState<Estado>(VAZIO)
  const [carregando, setCarregando] = useState(true)
  const isAdmin = usuario?.perfil === 'ADMIN'
  const logado = !!usuario

  const recarregar = useCallback(async () => {
    if (!logado) return
    try {
      const [rotas, alertas, comercios, freelancers, casas, familias] = await Promise.all([
        api.get<Rota[]>('/rotas'),
        api.get<Alerta[]>('/alertas'),
        api.get<Comercio[]>('/comercios'),
        api.get<Freelancer[]>('/freelancers'),
        isAdmin ? api.get<Casa[]>('/casas') : Promise.resolve([]),
        isAdmin ? api.get<Familia[]>('/familias') : Promise.resolve([]),
      ])
      setEstado((e) => ({ ...e, rotas, alertas, comercios, freelancers, casas, familias }))
    } catch (e) {
      console.warn('Falha ao carregar dados', e)
    } finally {
      setCarregando(false)
    }
  }, [logado, isAdmin])

  // Carrega ao entrar, limpa ao sair.
  useEffect(() => {
    if (logado) recarregar()
    else {
      setEstado(VAZIO)
      setCarregando(false)
    }
  }, [logado, recarregar])

  // Atualiza ao voltar para o app, para ver o que os vizinhos cadastraram.
  const recarregarRef = useRef(recarregar)
  recarregarRef.current = recarregar
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && recarregarRef.current())
    return () => sub.remove()
  }, [])

  useEffect(() => {
    setEstado((e) => ({ ...e, usuario: usuario?.nome ?? '' }))
  }, [usuario?.nome])

  // ---------------------------------------------------------------------------
  // Operações genéricas
  // ---------------------------------------------------------------------------
  const colocar = (chave: Colecao, item: { id: string }) =>
    setEstado((e) => {
      const lista = e[chave] as unknown as { id: string }[]
      const existe = lista.some((i) => i.id === item.id)
      return {
        ...e,
        [chave]: existe ? lista.map((i) => (i.id === item.id ? item : i)) : [item, ...lista],
      }
    })

  const tirar = (chave: Colecao, id: string) =>
    setEstado((e) => ({
      ...e,
      [chave]: (e[chave] as unknown as { id: string }[]).filter((i) => i.id !== id),
    }))

  function crud<T extends { id: string }>(chave: Colecao, caminho: string) {
    return {
      add: async (dados: Novo<T>) => {
        try {
          const novo = await api.post<T>(caminho, limpar(dados))
          colocar(chave, novo)
          return novo
        } catch (e) {
          mostrarErro(e)
          return null
        }
      },
      update: async (id: string, dados: Partial<T>) => {
        try {
          const atualizado = await api.patch<T>(`${caminho}/${id}`, limpar(dados))
          colocar(chave, atualizado)
          return atualizado
        } catch (e) {
          mostrarErro(e)
          return null
        }
      },
      remove: async (id: string) => {
        try {
          await api.delete(`${caminho}/${id}`)
          tirar(chave, id)
          return true
        } catch (e) {
          mostrarErro(e)
          return false
        }
      },
    }
  }

  const rotas = crud<Rota>('rotas', '/rotas')
  const alertas = crud<Alerta>('alertas', '/alertas')
  const comercios = crud<Comercio>('comercios', '/comercios')
  const freelancers = crud<Freelancer>('freelancers', '/freelancers')
  const casas = crud<Casa>('casas', '/casas')
  const familias = crud<Familia>('familias', '/familias')

  /** Alterna a confirmação do usuário logado (confirma ou desfaz). */
  async function alternarConfirmacao(chave: 'rotas' | 'alertas', id: string) {
    const item = (estado[chave] as Array<Rota | Alerta>).find((i) => i.id === id)
    const jaConfirmou = !!usuario && !!item?.confirmacoes.includes(usuario.id)
    try {
      const caminho = `/${chave}/${id}/confirmacao`
      const atualizado = jaConfirmou
        ? await api.delete<Rota | Alerta>(caminho)
        : await api.post<Rota | Alerta>(caminho)
      colocar(chave, atualizado)
    } catch (e) {
      mostrarErro(e)
    }
  }

  async function removerCasa(id: string) {
    const ok = await casas.remove(id)
    // O servidor desfaz o vínculo das famílias (ON DELETE SET NULL); espelha aqui.
    if (ok) {
      setEstado((e) => ({
        ...e,
        familias: e.familias.map((f) => (f.casaId === id ? { ...f, casaId: null } : f)),
      }))
    }
    return ok
  }

  const valor: Contexto = {
    estado,
    carregando,
    recarregar,
    setUsuario: (nome) => {
      atualizarPerfil({ nome }).then((r) => !r.ok && Alert.alert('Erro', r.erro ?? 'Falha ao salvar'))
    },

    addRota: rotas.add,
    updateRota: rotas.update,
    removeRota: rotas.remove,
    confirmarRota: (id) => alternarConfirmacao('rotas', id),

    addAlerta: alertas.add,
    updateAlerta: alertas.update,
    removeAlerta: alertas.remove,
    confirmarAlerta: (id) => alternarConfirmacao('alertas', id),
    resolverAlerta: async (id, resolvido = true) => {
      try {
        colocar('alertas', await api.post<Alerta>(`/alertas/${id}/resolver`, { resolvido }))
      } catch (e) {
        mostrarErro(e)
      }
    },

    addComercio: comercios.add,
    updateComercio: comercios.update,
    removeComercio: comercios.remove,

    addFreelancer: freelancers.add,
    updateFreelancer: freelancers.update,
    removeFreelancer: freelancers.remove,

    addCasa: casas.add,
    updateCasa: casas.update,
    removeCasa: removerCasa,

    addFamilia: familias.add,
    updateFamilia: familias.update,
    removeFamilia: familias.remove,

    restaurarDemo: async () => {
      try {
        await api.post('/admin/demo')
        await recarregar()
      } catch (e) {
        mostrarErro(e)
      }
    },
    limparTudo: async () => {
      try {
        await api.delete('/admin/dados', { confirmacao: 'APAGAR TUDO' })
        await recarregar()
      } catch (e) {
        mostrarErro(e)
      }
    },
    exportarJson: () => JSON.stringify(estado, null, 2),
    importarJson: async (texto) => {
      try {
        const dados = JSON.parse(texto) as Estado
        if (!Array.isArray(dados.rotas) || !Array.isArray(dados.familias)) {
          return { ok: false, erro: 'Arquivo não tem o formato esperado.' }
        }
        await api.post('/admin/importar', { dados, substituir: false })
        await recarregar()
        return { ok: true }
      } catch (err) {
        return { ok: false, erro: (err as Error).message }
      }
    },
  }

  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>
}

export function useApp(): Contexto {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>')
  return ctx
}
