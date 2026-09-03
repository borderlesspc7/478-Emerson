import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { isStayCheckOutExpired } from '../lib/auth'
import { getGuestHomePath } from '../lib/guestHomePath'
import { useAuth } from '../hooks/useAuth'
import { useGuestAccessSettings } from '../hooks/useGuestEarlyCheckInAccess'
import { resolveAccessReleaseAt } from '../lib/guestAccessRelease'
import { AccessExpiredPage } from '../pages/AccessExpired/AccessExpiredPage'
import type { AppUser } from '../types/user'
import { PATHS } from './path'

function guestHomePathWithAccessSettings(
  user: AppUser,
  earlyCheckInAccess: boolean,
  accessReleaseTime: string | null,
): string {
  if (user.role !== 'guest') return PATHS.dashboard
  const stay = user.stay
  if (!stay?.checkInAt || !stay?.checkOutAt) return PATHS.dashboard
  if (isStayCheckOutExpired(stay)) return PATHS.accessExpired
  return getGuestHomePath({ ...user, earlyCheckInAccess, accessReleaseTime })
}

/**
 * Rota pública: após logout por expiração o utilizador não tem sessão.
 * Se ainda houver sessão ativa dentro da janela da estadia, redireciona ao painel.
 */
export function AccessExpiredGate() {
  const { t } = useTranslation()
  const { user, authReady } = useAuth()
  const accessSettings = useGuestAccessSettings(user)

  if (!authReady) {
    return (
      <div className="app-shell-loading" role="status" aria-live="polite">
        <span className="app-shell-loading__spinner" aria-hidden />
        <span className="visually-hidden">{t('common.loadingSession')}</span>
      </div>
    )
  }

  const stay = user?.stay
  const hasWindow = Boolean(stay?.checkInAt && stay?.checkOutAt)
  if (user?.role === 'guest' && hasWindow && !isStayCheckOutExpired(stay!)) {
    const releaseAt = resolveAccessReleaseAt(
      stay!.checkInAt,
      accessSettings.accessReleaseTime,
    )
    return (
      <Navigate
        to={guestHomePathWithAccessSettings(
          { ...user, stay: { ...stay!, checkInAt: releaseAt } },
          accessSettings.earlyCheckInAccess,
          accessSettings.accessReleaseTime,
        )}
        replace
      />
    )
  }

  return <AccessExpiredPage />
}
