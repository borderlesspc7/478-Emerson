import { useTranslation } from 'react-i18next'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/path'
import '../../pages/shared/guestContent.css'
import './AdminLayout.css'

const adminNav = [
  { to: PATHS.adminOrders, labelKey: 'adminNav.orders' as const },
  { to: PATHS.adminProperties, labelKey: 'adminNav.properties' as const },
  { to: PATHS.adminAccess, labelKey: 'adminNav.access' as const },
]

export function AdminLayout() {
  const { t } = useTranslation()
  const { user, authReady } = useAuth()

  if (!authReady) {
    return (
      <div className="app-shell-loading" role="status" aria-live="polite">
        <span className="app-shell-loading__spinner" aria-hidden />
        <span className="visually-hidden">{t('common.loadingSession')}</span>
      </div>
    )
  }

  if (user?.role !== 'admin') {
    return <Navigate to={PATHS.dashboard} replace />
  }

  return (
    <div className="page-admin admin-shell">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('admin.title')}</h2>
        <p className="guest-content__lead">{t('admin.lead')}</p>
      </header>

      <nav aria-label={t('adminNav.aria')}>
        <ul className="admin-shell__subnav">
          {adminNav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => (isActive ? 'is-active' : '')}
                end={item.to === PATHS.adminOrders}
              >
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <Outlet />
    </div>
  )
}
