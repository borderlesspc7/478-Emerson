import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getDefaultPathForUser } from '../lib/defaultRoute'
import { AppLayout } from '../components/Layout/Layout'
import { LoginPage } from '../pages/Login/Login'
import { GuestMagicLoginPage } from '../pages/GuestMagicLogin/GuestMagicLoginPage'
import { DashboardPage } from '../pages/Dashboard/DashboardPage'
import { AdminLayout } from '../components/AdminLayout/AdminLayout'
import { AdminDashboardPage } from '../pages/Admin/AdminDashboardPage'
import { AdminAnalyticsPage } from '../pages/Admin/AdminAnalyticsPage'
import { AdminOrdersPage } from '../pages/Admin/AdminOrdersPage'
import { AdminPropertiesPage } from '../pages/Admin/AdminPropertiesPage'
import { AdminPropertyEditPage } from '../pages/Admin/AdminPropertyEditPage'
import { AdminAccessPage } from '../pages/Admin/AdminAccessPage'
import { AdminServicesPage } from '../pages/Admin/AdminServicesPage'
import { PreCheckInPage } from '../pages/PreCheckIn/PreCheckInPage'
import { PreCheckInPreviewPage } from '../pages/PreCheckIn/PreCheckInPreviewPage'
import { ReservationPage } from '../pages/Reservation/ReservationPage'
import { AboutPropertyPage } from '../pages/AboutProperty/AboutPropertyPage'
import { ServicesPage } from '../pages/Services/ServicesPage'
import { InterestsPage } from '../pages/Interests/InterestsPage'
import { ExtrasPage } from '../pages/Extras/ExtrasPage'
import { GuestSettingsPage } from '../pages/Settings/GuestSettingsPage'
import { PATHS } from './path'
import { AccessExpiredGate } from './AccessExpiredGate'
import { ProtectedRoute } from './ProtectedRoute'

function DefaultRedirect() {
  const { user } = useAuth()
  return <Navigate to={getDefaultPathForUser(user)} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      {import.meta.env.DEV ? (
        <Route path={PATHS.preCheckInPreview} element={<PreCheckInPreviewPage />} />
      ) : null}
      <Route path={PATHS.login} element={<LoginPage />} />
      <Route
        path={`${PATHS.guestDirectEntry}/:reservationCode`}
        element={<GuestMagicLoginPage />}
      />
      <Route path={PATHS.accessExpired} element={<AccessExpiredGate />} />
      <Route element={<ProtectedRoute />}>
        <Route path={PATHS.preCheckIn} element={<PreCheckInPage />} />
        <Route element={<AppLayout />}>
          <Route path={PATHS.dashboard} element={<DashboardPage />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="pedidos" element={<AdminOrdersPage />} />
            <Route path="servicos" element={<AdminServicesPage />} />
            <Route path="imoveis" element={<AdminPropertiesPage />} />
            <Route path="imoveis/:propertyId" element={<AdminPropertyEditPage />} />
            <Route path="acessos" element={<AdminAccessPage />} />
          </Route>
          <Route path={PATHS.reservation} element={<ReservationPage />} />
          <Route path={PATHS.aboutProperty} element={<AboutPropertyPage />} />
          <Route path={PATHS.interests} element={<InterestsPage />} />
          <Route path={PATHS.extras} element={<ExtrasPage />} />
          <Route path={PATHS.services} element={<ServicesPage />} />
          <Route path={PATHS.settings} element={<GuestSettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  )
}
