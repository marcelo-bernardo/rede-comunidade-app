import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { SEED } from '../lib/seed'
import type {
  Alerta,
  Casa,
  Comercio,
  Estado,
  Familia,
  Freelancer,
  Rota,
} from '../lib/types'
import { hoje, uid } from '../lib/utils'

const CHAVE = 'rede-comunidade:v1'

function carregar(): Estado {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return structuredClone(SEED)
    const salvo = JSON.parse(bruto) as Partial<Estado>
    // Mescla com o seed vazio para tolerar estados salvos por versões antigas.
    return {
      usuario: salvo.usuario ?? SEED.usuario,
      rotas: salvo.rotas ?? [],
      alertas: salvo.alertas ?? [],
      comercios: salvo.comercios ?? [],
      freelancers: salvo.freelancers ?? [],
      casas: salvo.casas ?? [],
      familias: salvo.familias ?? [],
    }
  } catch {
    return structuredClone(SEED)
  }
}

type Novo<T> = Omit<T, 'id' | 'criadoEm' | 'criadaEm'>

type Contexto = {
  estado: Estado
  setUsuario: (nome: string) => void

  addRota: (dados: Novo<Rota>) => Rota
  updateRota: (id: string, dados: Partial<Rota>) => void
  removeRota: (id: string) => void
  confirmarRota: (id: string) => void

  addAlerta: (dados: Novo<Alerta>) => Alerta
  updateAlerta: (id: string, dados: Partial<Alerta>) => void
  removeAlerta: (id: string) => void
  confirmarAlerta: (id: string) => void

  addComercio: (dados: Novo<Comercio>) => Comercio
  updateComercio: (id: string, dados: Partial<Comercio>) => void
  removeComercio: (id: string) => void

  addFreelancer: (dados: Novo<Freelancer>) => Freelancer
  updateFreelancer: (id: string, dados: Partial<Freelancer>) => void
  removeFreelancer: (id: string) => void

  addCasa: (dados: Novo<Casa>) => Casa
  updateCasa: (id: string, dados: Partial<Casa>) => void
  removeCasa: (id: string) => void

  addFamilia: (dados: Novo<Familia>) => Familia
  updateFamilia: (id: string, dados: Partial<Familia>) => void
  removeFamilia: (id: string) => void

  restaurarDemo: () => void
  limparTudo: () => void
  exportarJson: () => string
  importarJson: (texto: string) => { ok: boolean; erro?: string }
}

const AppContext = createContext<Contexto | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(carregar)

  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(estado))
  }, [estado])

  /** Chaves do estado que guardam coleções (tudo menos o nome do usuário). */
  type ChaveColecao = Exclude<keyof Estado, 'usuario'>

  /** Gera um CRUD completo para uma das coleções do estado. */
  function colecao<T extends { id: string }>(
    chave: ChaveColecao,
    prefixo: string,
    campoData: 'criadoEm' | 'criadaEm',
  ) {
    const ler = (e: Estado) => e[chave] as unknown as T[]

    const add = (dados: Novo<T>): T => {
      const item = { ...dados, id: uid(prefixo), [campoData]: hoje() } as unknown as T
      setEstado((e) => ({ ...e, [chave]: [item, ...ler(e)] }))
      return item
    }
    const update = (id: string, dados: Partial<T>) =>
      setEstado((e) => ({
        ...e,
        [chave]: ler(e).map((i) => (i.id === id ? { ...i, ...dados } : i)),
      }))
    const remove = (id: string) =>
      setEstado((e) => ({ ...e, [chave]: ler(e).filter((i) => i.id !== id) }))

    return { add, update, remove }
  }

  const rotas = useMemo(() => colecao<Rota>('rotas', 'rota', 'criadaEm'), [])
  const alertas = useMemo(() => colecao<Alerta>('alertas', 'alerta', 'criadoEm'), [])
  const comercios = useMemo(() => colecao<Comercio>('comercios', 'com', 'criadoEm'), [])
  const freelancers = useMemo(
    () => colecao<Freelancer>('freelancers', 'free', 'criadoEm'),
    [],
  )
  const casas = useMemo(() => colecao<Casa>('casas', 'casa', 'criadaEm'), [])
  const familias = useMemo(() => colecao<Familia>('familias', 'fam', 'criadaEm'), [])

  /** Alterna a confirmação do usuário atual em uma rota ou alerta. */
  const alternarConfirmacao = useCallback(
    (chave: 'rotas' | 'alertas', id: string) =>
      setEstado((e) => {
        const lista = e[chave] as Array<{ id: string; confirmacoes: string[] }>
        return {
          ...e,
          [chave]: lista.map((item) => {
            if (item.id !== id) return item
            const jaConfirmou = item.confirmacoes.includes(e.usuario)
            return {
              ...item,
              confirmacoes: jaConfirmou
                ? item.confirmacoes.filter((n) => n !== e.usuario)
                : [...item.confirmacoes, e.usuario],
            }
          }),
        }
      }),
    [],
  )

  const removerCasa = useCallback((id: string) => {
    // Desvincula as famílias antes de apagar a casa, para não deixar órfãos.
    setEstado((e) => ({
      ...e,
      casas: e.casas.filter((c) => c.id !== id),
      familias: e.familias.map((f) => (f.casaId === id ? { ...f, casaId: null } : f)),
    }))
  }, [])

  const valor: Contexto = {
    estado,
    setUsuario: (nome) => setEstado((e) => ({ ...e, usuario: nome })),

    addRota: rotas.add,
    updateRota: rotas.update,
    removeRota: rotas.remove,
    confirmarRota: (id) => alternarConfirmacao('rotas', id),

    addAlerta: alertas.add,
    updateAlerta: alertas.update,
    removeAlerta: alertas.remove,
    confirmarAlerta: (id) => alternarConfirmacao('alertas', id),

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

    restaurarDemo: () => setEstado(structuredClone(SEED)),
    limparTudo: () =>
      setEstado((e) => ({
        usuario: e.usuario,
        rotas: [],
        alertas: [],
        comercios: [],
        freelancers: [],
        casas: [],
        familias: [],
      })),
    exportarJson: () => JSON.stringify(estado, null, 2),
    importarJson: (texto) => {
      try {
        const dados = JSON.parse(texto) as Estado
        if (!Array.isArray(dados.rotas) || !Array.isArray(dados.familias)) {
          return { ok: false, erro: 'Arquivo não tem o formato esperado.' }
        }
        setEstado(dados)
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
