import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { GuestStayExpiryMonitor } from '../components/GuestStayExpiryMonitor/GuestStayExpiryMonitor'
import { useGuestEarlyCheckInAccess } from '../hooks/useGuestEarlyCheckInAccess'
import { isGuestPreCheckInLocked, isStayCheckOutExpired } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'
import { PATHS } from './path'

export function ProtectedRoute() {
  const { t } = useTranslation()
  const { user, authReady } = useAuth()
  const location = useLocation()
  const earlyCheckInAccess = useGuestEarlyCheckInAccess(user)

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
  const stayExpired =
    user.role === 'guest' && Boolean(stay) && hasStayWindow && isStayCheckOutExpired(stay!)
  const preCheckIn =
    user.role === 'guest' &&
    Boolean(stay) &&
    hasStayWindow &&
    isGuestPreCheckInLocked(stay!, { earlyCheckInAccess })
  const onPreCheckInPage = location.pathname === PATHS.preCheckIn

  const isAdminArea =
    location.pathname === PATHS.admin || location.pathname.startsWith(`${PATHS.admin}/`)

  if (user.role === 'admin' && location.pathname === PATHS.dashboard) {
    return <Navigate to={PATHS.admin} replace />
  }

  if (user.role === 'guest' && isAdminArea) {
    return <Navigate to={PATHS.dashboard} replace />
  }

  if (stayExpired) {
    return <Navigate to={PATHS.accessExpired} replace />
  }

  if (preCheckIn && !onPreCheckInPage) {
    return <Navigate to={PATHS.preCheckIn} replace />
  }

  if (!preCheckIn && onPreCheckInPage) {
    return <Navigate to={PATHS.dashboard} replace />
  }

  return (
    <>
      <GuestStayExpiryMonitor />
      <Outlet />
    </>
  )
}
