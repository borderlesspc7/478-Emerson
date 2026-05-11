import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { PATHS } from '../../routes/path'
import { Header } from '../Header/Header'
import { Sidebar } from '../Sidebar/Sidebar'
import './Layout.css'

export function AppLayout() {
  const { t } = useTranslation()
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

  const { pathname } = location
  const title = useMemo(() => {
    const adminBase = PATHS.admin
    if (pathname === adminBase || pathname.startsWith(`${adminBase}/`)) {
      if (pathname === PATHS.adminOrders) {
        return t('adminOrders.title')
      }
      if (pathname === PATHS.adminServices) {
        return t('adminServices.title')
      }
      if (pathname === PATHS.adminProperties) {
        return t('adminProperties.title')
      }
      if (pathname.startsWith(`${PATHS.adminProperties}/`)) {
        return t('adminPropertyEdit.pageTitle')
      }
      if (pathname === PATHS.adminAccess) {
        return t('adminAccess.title')
      }
      return t('nav.admin')
    }
    const map: Record<string, string> = {
      [PATHS.dashboard]: t('nav.overview'),
      [PATHS.reservation]: t('nav.reservation'),
      [PATHS.aboutProperty]: t('nav.aboutProperty'),
      [PATHS.interests]: t('nav.interests'),
      [PATHS.extras]: t('nav.extras'),
      [PATHS.services]: t('nav.services'),
      [PATHS.settings]: t('nav.settings'),
    }
    return map[pathname] ?? t('layout.panel')
  }, [pathname, t])

  const userLabel =
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    t('common.account')
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
      ? t('layout.expandSidebar')
      : t('layout.collapseSidebar')
    : mobileDrawerOpen
      ? t('layout.closeMenu')
      : t('layout.openMenu')

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
          logoutLabel={t('header.logout')}
        />
        <main className="app-layout__content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
