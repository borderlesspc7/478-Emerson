import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { isStayCheckOutExpired } from '../lib/auth'
import { getGuestHomePath } from '../lib/guestHomePath'
import { useAuth } from '../hooks/useAuth'
import { AccessExpiredPage } from '../pages/AccessExpired/AccessExpiredPage'

/**
 * Rota pública: após logout por expiração o utilizador não tem sessão.
 * Se ainda houver sessão ativa dentro da janela da estadia, redireciona ao painel.
 */
export function AccessExpiredGate() {
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

  const stay = user?.stay
  const hasWindow = Boolean(stay?.checkInAt && stay?.checkOutAt)
  if (user?.role === 'guest' && hasWindow && !isStayCheckOutExpired(stay!)) {
    return <Navigate to={getGuestHomePath(user)} replace />
  }

  return <AccessExpiredPage />
}
