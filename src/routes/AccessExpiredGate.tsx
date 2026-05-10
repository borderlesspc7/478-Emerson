import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { isStayAccessActive } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'
import { AccessExpiredPage } from '../pages/AccessExpired/AccessExpiredPage'
import { PATHS } from './path'

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
  if (user && hasWindow && isStayAccessActive(stay!)) {
    return <Navigate to={PATHS.dashboard} replace />
  }

  return <AccessExpiredPage />
}
