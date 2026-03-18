import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/Layout/Layout'
import { LoginPage } from '../pages/Login/Login'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { PATHS } from './path'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={PATHS.dashboard} element={<DashboardPage />} />
          <Route
            path={PATHS.reports}
            element={
              <PlaceholderPage
                title="Relatórios"
                description="Exporte e visualize relatórios. Conecte esta rota aos seus dados reais."
              />
            }
          />
          <Route
            path={PATHS.team}
            element={
              <PlaceholderPage
                title="Equipe"
                description="Gerencie membros e permissões da organização."
              />
            }
          />
          <Route
            path={PATHS.settings}
            element={
              <PlaceholderPage
                title="Configurações"
                description="Preferências da conta, notificações e integrações."
              />
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={PATHS.dashboard} replace />} />
    </Routes>
  )
}
