import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isStayAccessActive } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'
import { PATHS } from './path'

export function ProtectedRoute() {
  const { t } = useTranslation()
  const { user, authReady } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <div className="app-shell-loading" role="status" aria-live="polite">
        <span className="app-shell-loading__spinner" aria-hidden />
        <span className="visually-hidden">{t('common.loadingSession')}</span>
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to={PATHS.login}
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  const stay = user.stay
  const hasStayWindow = Boolean(stay?.checkInAt && stay?.checkOutAt)
  const stayBlocked =
    Boolean(stay) && hasStayWindow && !isStayAccessActive(stay!)

  if (location.pathname === PATHS.accessExpired) {
    if (!stayBlocked) {
      return <Navigate to={PATHS.dashboard} replace />
    }
    return <Outlet />
  }

  if (stayBlocked) {
    return <Navigate to={PATHS.accessExpired} replace />
  }

  if (user.role === 'guest' && location.pathname === PATHS.admin) {
    return <Navigate to={PATHS.dashboard} replace />
  }

  return <Outlet />
}
