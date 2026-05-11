import { useTranslation } from 'react-i18next'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/path'
import '../../pages/shared/guestContent.css'
import './AdminLayout.css'

/**
 * Invólucro da área admin: validação de sessão + largura máxima.
 * Cada funcionalidade é uma rota absoluta filha (ver `AppRoutes`).
 */
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
      <Outlet />
    </div>
  )
}
