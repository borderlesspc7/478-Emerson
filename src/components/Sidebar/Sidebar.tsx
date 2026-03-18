import { NavLink } from 'react-router-dom'
import { PATHS } from '../../routes/path'
import './Sidebar.css'

const nav = [
  { to: PATHS.dashboard, label: 'Visão geral', icon: IconHome },
  { to: PATHS.reports, label: 'Relatórios', icon: IconChart },
  { to: PATHS.team, label: 'Equipe', icon: IconUsers },
  { to: PATHS.settings, label: 'Configurações', icon: IconSettings },
] as const

type SidebarProps = {
  open: boolean
  showBackdrop?: boolean
  onNavigate?: () => void
}

export function Sidebar({ open, showBackdrop, onNavigate }: SidebarProps) {
  const backdrop = showBackdrop ?? false
  return (
    <>
      <div
        className={`app-sidebar-backdrop ${backdrop ? 'is-open' : ''}`}
        aria-hidden={!backdrop}
        onClick={onNavigate}
      />
      <aside
        className={`app-sidebar ${open ? 'is-open' : ''}`}
        aria-label="Navegação principal"
        aria-hidden={!open}
      >
        <div className="app-sidebar__brand">
          <span className="app-sidebar__logo" aria-hidden />
          <span className="app-sidebar__name">Workspace</span>
        </div>

        <nav className="app-sidebar__nav">
          <ul className="app-sidebar__list">
            {nav.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === PATHS.dashboard}
                  className={({ isActive }) =>
                    `app-sidebar__link ${isActive ? 'is-active' : ''}`
                  }
                  onClick={onNavigate}
                >
                  <Icon className="app-sidebar__icon" />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="app-sidebar__footer">
          <p className="app-sidebar__hint">v1.0 · Ambiente seguro</p>
        </div>
      </aside>
    </>
  )
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}
