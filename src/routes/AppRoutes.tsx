import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/Layout/Layout'
import { LocaleSwitcher } from '../components/LocaleSwitcher/LocaleSwitcher'
import { AccessExpiredPage } from '../pages/AccessExpired/AccessExpiredPage'
import { LoginPage } from '../pages/Login/Login'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { PATHS } from './path'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  const { t } = useTranslation()

  return (
    <Routes>
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path={PATHS.accessExpired} element={<AccessExpiredPage />} />
        <Route element={<AppLayout />}>
          <Route path={PATHS.dashboard} element={<DashboardPage />} />
          <Route
            path={PATHS.reservation}
            element={
              <PlaceholderPage
                title={t('placeholders.reservationTitle')}
                description={t('placeholders.reservationDesc')}
              />
            }
          />
          <Route
            path={PATHS.services}
            element={
              <PlaceholderPage
                title={t('placeholders.servicesTitle')}
                description={t('placeholders.servicesDesc')}
              />
            }
          />
          <Route
            path={PATHS.settings}
            element={
              <PlaceholderPage
                title={t('placeholders.settingsTitle')}
                description={t('placeholders.settingsDesc')}
              >
                <LocaleSwitcher />
              </PlaceholderPage>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={PATHS.dashboard} replace />} />
    </Routes>
  )
}
