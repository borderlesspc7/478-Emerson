import { useCallback, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { PATHS } from '../../routes/path'
import { Header } from '../Header/Header'
import { Sidebar } from '../Sidebar/Sidebar'
import './Layout.css'

const titles: Record<string, string> = {
  [PATHS.dashboard]: 'Visão geral',
  [PATHS.reservation]: 'Reserva',
  [PATHS.services]: 'Serviços',
  [PATHS.settings]: 'Configurações',
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const sidebarExpanded = isDesktop || sidebarOpen

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), [])

  const title = titles[location.pathname] ?? 'Painel'

  const userLabel =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'Conta'
  const userInitial = (userLabel[0] ?? '?').toUpperCase()

  async function handleLogout() {
    setLogoutLoading(true)
    try {
      await logout()
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        open={sidebarExpanded}
        showBackdrop={!isDesktop && sidebarOpen}
        onNavigate={closeSidebar}
      />
      <div className="app-layout__main">
        <Header
          title={title}
          onMenuClick={toggleSidebar}
          userLabel={user?.email ?? userLabel}
          userInitial={userInitial}
          onLogout={handleLogout}
          logoutLoading={logoutLoading}
        />
        <main className="app-layout__content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
