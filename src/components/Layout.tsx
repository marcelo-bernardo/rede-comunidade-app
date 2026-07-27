import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../store/AppStore'

const LINKS = [
  { to: '/', label: 'Painel', icone: '◎' },
  { to: '/mapa', label: 'Mapa de rotas', icone: '⛬' },
  { to: '/comercios', label: 'Comércios', icone: '⌂' },
  { to: '/freelancers', label: 'Freelancers', icone: '✦' },
  { to: '/casas', label: 'Casas', icone: '⌗' },
  { to: '/familias', label: 'Famílias', icone: '☗' },
  { to: '/ajustes', label: 'Ajustes', icone: '⚙' },
]

export default function Layout() {
  const { estado } = useApp()

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-slate-200 bg-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:sticky lg:top-0">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">
            R
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-slate-900">
              Rede Comunidade
            </p>
            <p className="text-xs text-slate-500">Mapa vivo do território</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="text-base opacity-70">{l.icone}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden border-t border-slate-200 px-5 py-4 lg:block">
          <p className="text-xs text-slate-400">Contribuindo como</p>
          <p className="text-sm font-medium text-slate-700">{estado.usuario}</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
