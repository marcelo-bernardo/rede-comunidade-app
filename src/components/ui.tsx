import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({
  titulo,
  descricao,
  acao,
}: {
  titulo: string
  descricao?: string
  acao?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{titulo}</h1>
        {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acao}
    </div>
  )
}

type BotaoProps = {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variante?: 'primario' | 'secundario' | 'perigo' | 'fantasma'
  className?: string
  disabled?: boolean
}

export function Botao({
  children,
  onClick,
  type = 'button',
  variante = 'primario',
  className = '',
  disabled,
}: BotaoProps) {
  const estilos: Record<string, string> = {
    primario: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secundario: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    perigo: 'bg-red-600 text-white hover:bg-red-700',
    fantasma: 'text-slate-600 hover:bg-slate-100',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${estilos[variante]} ${className}`}
    >
      {children}
    </button>
  )
}

export function Badge({
  children,
  className = 'bg-slate-100 text-slate-700',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  )
}

export function Campo({
  label,
  children,
  dica,
  className = '',
}: {
  label: string
  children: ReactNode
  dica?: string
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-slate-400">{dica}</span>}
    </label>
  )
}

const baseInput =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${baseInput} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseInput} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${baseInput} ${props.className ?? ''}`} />
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      {label}
    </label>
  )
}

/** Grupo de checkboxes que edita um array de strings. */
export function MultiSelect<T extends string>({
  opcoes,
  valor,
  onChange,
}: {
  opcoes: readonly T[]
  valor: T[]
  onChange: (v: T[]) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((op) => {
        const ativo = valor.includes(op)
        return (
          <button
            key={op}
            type="button"
            onClick={() =>
              onChange(ativo ? valor.filter((v) => v !== op) : [...valor, op])
            }
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              ativo
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {op}
          </button>
        )
      })}
    </div>
  )
}

export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
  largura = 'max-w-2xl',
}: {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
  largura?: string
}) {
  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className={`w-full ${largura} rounded-xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
          <button
            onClick={onFechar}
            className="rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Vazio({ texto, acao }: { texto: string; acao?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm text-slate-500">{texto}</p>
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  )
}

export function Estatistica({
  rotulo,
  valor,
  detalhe,
  cor = 'text-slate-900',
}: {
  rotulo: string
  valor: string | number
  detalhe?: string
  cor?: string
}) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className={`mt-1.5 text-3xl font-semibold ${cor}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-slate-400">{detalhe}</p>}
    </Card>
  )
}
