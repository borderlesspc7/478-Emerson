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
  /** Drawer mobile (overlay) */
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  /** Desktop: barra estreita só com ícones */
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), [])

  const toggleSidebar = useCallback(() => {
    if (isDesktop) {
      setDesktopCollapsed((c) => !c)
    } else {
      setMobileDrawerOpen((o) => !o)
    }
  }, [isDesktop])

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

  const menuAriaLabel = isDesktop
    ? desktopCollapsed
      ? 'Expandir barra lateral'
      : 'Recolher barra lateral'
    : mobileDrawerOpen
      ? 'Fechar menu de navegação'
      : 'Abrir menu de navegação'

  return (
    <div className="app-layout">
      <Sidebar
        open={isDesktop ? true : mobileDrawerOpen}
        collapsed={isDesktop && desktopCollapsed}
        isDesktop={isDesktop}
        showBackdrop={!isDesktop && mobileDrawerOpen}
        onNavigate={closeMobileDrawer}
        onToggleSidebar={toggleSidebar}
      />
      <div className="app-layout__main">
        <Header
          title={title}
          onMenuClick={toggleSidebar}
          menuAriaLabel={menuAriaLabel}
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
