import { GiLotusFlower } from 'react-icons/gi'
import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from 'react-icons/md'
import { NavLink } from 'react-router-dom'
import { PATHS } from '../../routes/path'
import './Sidebar.css'

const nav = [
  { to: PATHS.dashboard, label: 'Visão geral', icon: IconHome },
  { to: PATHS.reservation, label: 'Reserva', icon: IconChart },
  { to: PATHS.services, label: 'Serviços', icon: IconUsers },
  { to: PATHS.settings, label: 'Configurações', icon: IconSettings },
] as const

type SidebarProps = {
  /** Mobile: drawer aberto. Desktop: sempre true (barra visível). */
  open: boolean
  /** Desktop: modo só ícones */
  collapsed: boolean
  isDesktop: boolean
  showBackdrop?: boolean
  onNavigate?: () => void
  onToggleSidebar: () => void
}

export function Sidebar({
  open,
  collapsed,
  isDesktop,
  showBackdrop,
  onNavigate,
  onToggleSidebar,
}: SidebarProps) {
  const backdrop = showBackdrop ?? false

  return (
    <>
      <div
        className={`app-sidebar-backdrop ${backdrop ? 'is-open' : ''}`}
        aria-hidden={!backdrop}
        onClick={onNavigate}
      />
      <aside
        className={[
          'app-sidebar',
          open ? 'is-open' : '',
          collapsed ? 'is-collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="Navegação principal"
        aria-hidden={!open}
      >
        <div className="app-sidebar__brand">
          <span className="app-sidebar__logo" aria-hidden>
            <GiLotusFlower className="app-sidebar__logo-icon" aria-hidden />
          </span>
          <span className="app-sidebar__name">Guia da Zen</span>
        </div>

        <nav className="app-sidebar__nav" aria-label="Páginas">
          <ul className="app-sidebar__list">
            {nav.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === PATHS.dashboard}
                  className={({ isActive }) =>
                    `app-sidebar__link ${isActive ? 'is-active' : ''}`
                  }
                  title={label}
                  onClick={onNavigate}
                >
                  <Icon className="app-sidebar__icon" />
                  <span className="app-sidebar__label">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {isDesktop ? (
          <div className="app-sidebar__toolbar">
            <button
              type="button"
              className="app-sidebar__collapse-btn"
              onClick={onToggleSidebar}
              aria-label={
                collapsed
                  ? 'Expandir barra lateral'
                  : 'Recolher barra lateral'
              }
              title={collapsed ? 'Expandir' : 'Recolher'}
            >
              {collapsed ? (
                <MdKeyboardDoubleArrowRight aria-hidden className="app-sidebar__collapse-icon" />
              ) : (
                <MdKeyboardDoubleArrowLeft aria-hidden className="app-sidebar__collapse-icon" />
              )}
            </button>
          </div>
        ) : null}

        <div className="app-sidebar__footer">
          <p className="app-sidebar__hint">v1.0 · Guia do hóspede</p>
        </div>
      </aside>
    </>
  )
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}
