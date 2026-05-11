import { useTranslation } from 'react-i18next'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/Layout/Layout'
import { LocaleSwitcher } from '../components/LocaleSwitcher/LocaleSwitcher'
import { ThemeSwitcher } from '../components/ThemeSwitcher/ThemeSwitcher'
import { LoginPage } from '../pages/Login/Login'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { AdminLayout } from '../components/AdminLayout/AdminLayout'
import { AdminOrdersPage } from '../pages/Admin/AdminOrdersPage'
import { AdminPropertiesPage } from '../pages/Admin/AdminPropertiesPage'
import { AdminPropertyEditPage } from '../pages/Admin/AdminPropertyEditPage'
import { AdminAccessPage } from '../pages/Admin/AdminAccessPage'
import { AdminServicesPage } from '../pages/Admin/AdminServicesPage'
import { ReservationPage } from '../pages/Reservation/ReservationPage'
import { AboutPropertyPage } from '../pages/AboutProperty/AboutPropertyPage'
import { ServicesPage } from '../pages/Services/ServicesPage'
import { InterestsPage } from '../pages/Interests/InterestsPage'
import { ExtrasPage } from '../pages/Extras/ExtrasPage'
import { PlaceholderPage } from '../pages/PlaceholderPage'
import { PATHS } from './path'
import { AccessExpiredGate } from './AccessExpiredGate'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  const { t } = useTranslation()

  return (
    <Routes>
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route path={PATHS.accessExpired} element={<AccessExpiredGate />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path={PATHS.dashboard} element={<DashboardPage />} />
          <Route path={PATHS.admin} element={<Navigate to={PATHS.adminOrders} replace />} />
          <Route element={<AdminLayout />}>
            <Route path={PATHS.adminOrders} element={<AdminOrdersPage />} />
            <Route path={PATHS.adminServices} element={<AdminServicesPage />} />
            <Route path={PATHS.adminProperties} element={<AdminPropertiesPage />} />
            <Route
              path={`${PATHS.adminProperties}/:propertyId`}
              element={<AdminPropertyEditPage />}
            />
            <Route path={PATHS.adminAccess} element={<AdminAccessPage />} />
          </Route>
          <Route path={PATHS.reservation} element={<ReservationPage />} />
          <Route path={PATHS.aboutProperty} element={<AboutPropertyPage />} />
          <Route path={PATHS.interests} element={<InterestsPage />} />
          <Route path={PATHS.extras} element={<ExtrasPage />} />
          <Route path={PATHS.services} element={<ServicesPage />} />
          <Route
            path={PATHS.settings}
            element={
              <PlaceholderPage
                title={t('placeholders.settingsTitle')}
                description={t('placeholders.settingsDesc')}
              >
                <ThemeSwitcher />
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
