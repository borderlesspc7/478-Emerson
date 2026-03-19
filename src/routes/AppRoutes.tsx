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
            path={PATHS.reservation}
            element={
              <PlaceholderPage
                title="Dados da Reserva"
                description="Endereço, unidade, datas de check-in/check-out e instruções da hospedagem."
              />
            }
          />
          <Route
            path={PATHS.services}
            element={
              <PlaceholderPage
                title="Serviços"
                description="Solicite limpeza, suporte e extras durante sua estadia."
              />
            }
          />
          <Route
            path={PATHS.settings}
            element={
              <PlaceholderPage
                title="Configurações"
                description="Idioma, termos de uso e preferências básicas do hóspede."
              />
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={PATHS.dashboard} replace />} />
    </Routes>
  )
}
