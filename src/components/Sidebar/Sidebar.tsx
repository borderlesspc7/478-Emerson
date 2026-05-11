import { useMemo } from 'react'
import { useServiceRequests } from '../../hooks/useServiceRequests'
import {
  FiClipboard,
  FiHome,
  FiInfo,
  FiKey,
  FiMapPin,
  FiPhone,
  FiShield,
  FiStar,
} from 'react-icons/fi'
import { GiLotusFlower } from 'react-icons/gi'
import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/path'
import './Sidebar.css'

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
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const backdrop = showBackdrop ?? false
  const isAdmin = user?.role === 'admin'
  const isAdminRoute =
    pathname === PATHS.admin || pathname.startsWith(`${PATHS.admin}/`)

  const { requests: adminServiceRequests } = useServiceRequests(
    isAdmin ? user?.uid : undefined,
    { adminView: true }
  )
  const pendingOrdersCount = useMemo(
    () => adminServiceRequests.filter((r) => r.status === 'pending').length,
    [adminServiceRequests]
  )
  const pendingOrdersBadge =
    pendingOrdersCount > 99 ? '99+' : pendingOrdersCount > 0 ? String(pendingOrdersCount) : null

  const nav = useMemo(() => {
    if (isAdmin && isAdminRoute) {
      return [
        {
          to: PATHS.adminOrders,
          labelKey: 'adminNav.orders' as const,
          icon: FiClipboard,
        },
        {
          to: PATHS.adminServices,
          labelKey: 'adminNav.services' as const,
          icon: FiPhone,
        },
        {
          to: PATHS.adminProperties,
          labelKey: 'adminNav.properties' as const,
          icon: FiHome,
        },
        {
          to: PATHS.adminAccess,
          labelKey: 'adminNav.access' as const,
          icon: FiKey,
        },
      ] as const
    }

    return [
      { to: PATHS.dashboard, labelKey: 'nav.overview' as const, icon: IconHome },
      ...(isAdmin
        ? [
            {
              to: PATHS.admin,
              labelKey: 'nav.admin' as const,
              icon: FiShield,
            },
          ]
        : []),
      {
        to: PATHS.reservation,
        labelKey: 'nav.reservation' as const,
        icon: IconChart,
      },
      {
        to: PATHS.aboutProperty,
        labelKey: 'nav.aboutProperty' as const,
        icon: FiInfo,
      },
      {
        to: PATHS.interests,
        labelKey: 'nav.interests' as const,
        icon: FiMapPin,
      },
      {
        to: PATHS.extras,
        labelKey: 'nav.extras' as const,
        icon: FiStar,
      },
      { to: PATHS.services, labelKey: 'nav.services' as const, icon: IconUsers },
      {
        to: PATHS.settings,
        labelKey: 'nav.settings' as const,
        icon: IconSettings,
      },
    ] as const
  }, [isAdmin, isAdminRoute])

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
        aria-label={t('nav.mainAria')}
        aria-hidden={!open}
      >
        <div className="app-sidebar__brand">
          <span className="app-sidebar__logo" aria-hidden>
            <GiLotusFlower className="app-sidebar__logo-icon" aria-hidden />
          </span>
          <span className="app-sidebar__name">{t('nav.brand')}</span>
        </div>

        <nav className="app-sidebar__nav" aria-label={t('nav.pagesAria')}>
          <ul className="app-sidebar__list">
            {nav.map(({ to, labelKey, icon: Icon }) => {
              const label = t(labelKey)
              const showOrdersBadge =
                to === PATHS.adminOrders && pendingOrdersBadge !== null
              const ordersAria = showOrdersBadge
                ? `${label}. ${t('nav.pendingOrdersAria', { count: pendingOrdersCount })}`
                : undefined
              return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={
                    to === PATHS.dashboard ||
                    to === PATHS.adminOrders ||
                    to === PATHS.adminServices ||
                    to === PATHS.adminAccess
                  }
                  className={({ isActive }) =>
                    [
                      'app-sidebar__link',
                      isActive ? 'is-active' : '',
                      showOrdersBadge ? 'app-sidebar__link--with-badge' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                  title={label}
                  {...(ordersAria ? { 'aria-label': ordersAria } : {})}
                  onClick={onNavigate}
                >
                  <Icon className="app-sidebar__icon" />
                  <span className="app-sidebar__label">{label}</span>
                  {showOrdersBadge ? (
                    <span className="app-sidebar__badge" aria-hidden>
                      {pendingOrdersBadge}
                    </span>
                  ) : null}
                </NavLink>
              </li>
              )
            })}
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
                  ? t('layout.expandSidebar')
                  : t('layout.collapseSidebar')
              }
              title={collapsed ? t('nav.expandShort') : t('nav.collapseShort')}
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
          <p className="app-sidebar__hint">{t('nav.footerHint')}</p>
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
