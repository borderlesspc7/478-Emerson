import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PATHS } from './path'

export function ProtectedRoute() {
  const { user, authReady } = useAuth()
  const location = useLocation()

  if (!authReady) {
    return (
      <div className="app-shell-loading" role="status" aria-live="polite">
        <span className="app-shell-loading__spinner" aria-hidden />
        <span className="visually-hidden">Carregando sessão…</span>
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

  return <Outlet />
}
