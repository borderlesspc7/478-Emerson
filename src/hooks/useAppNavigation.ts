import { useMemo } from 'react'
import type { IconType } from 'react-icons'
import { useAuth } from './useAuth'
import { useServiceRequests } from './useServiceRequests'
import { ADMIN_NAV_ICONS, GUEST_NAV_ICONS } from '../navigation/navIcons'
import { PATHS } from '../routes/path'

export type AppNavItem = {
  to: string
  labelKey: string
  icon: IconType
  matchEnd?: boolean
  showOrdersBadge?: boolean
}

export function useAppNavigation() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const { requests: adminServiceRequests } = useServiceRequests(
    isAdmin ? user?.uid : undefined,
    { adminView: true },
  )

  const pendingOrdersCount = useMemo(
    () => adminServiceRequests.filter((r) => r.status !== 'completed').length,
    [adminServiceRequests],
  )

  const pendingOrdersBadge =
    pendingOrdersCount > 99 ? '99+' : pendingOrdersCount > 0 ? String(pendingOrdersCount) : null

  const items = useMemo((): AppNavItem[] => {
    if (isAdmin) {
      return [
        {
          to: PATHS.admin,
          labelKey: 'adminNav.dashboard',
          icon: ADMIN_NAV_ICONS.dashboard,
          matchEnd: true,
        },
        {
          to: PATHS.adminAnalytics,
          labelKey: 'adminNav.analytics',
          icon: ADMIN_NAV_ICONS.analytics,
          matchEnd: true,
        },
        {
          to: PATHS.adminOrders,
          labelKey: 'adminNav.orders',
          icon: ADMIN_NAV_ICONS.orders,
          matchEnd: true,
          showOrdersBadge: true,
        },
        {
          to: PATHS.adminServices,
          labelKey: 'adminNav.services',
          icon: ADMIN_NAV_ICONS.services,
          matchEnd: true,
        },
        {
          to: PATHS.adminProperties,
          labelKey: 'adminNav.properties',
          icon: ADMIN_NAV_ICONS.properties,
        },
        {
          to: PATHS.adminAccess,
          labelKey: 'adminNav.access',
          icon: ADMIN_NAV_ICONS.access,
          matchEnd: true,
        },
      ]
    }

    return [
      {
        to: PATHS.dashboard,
        labelKey: 'nav.overview',
        icon: GUEST_NAV_ICONS.home,
        matchEnd: true,
      },
      {
        to: PATHS.reservation,
        labelKey: 'nav.reservation',
        icon: GUEST_NAV_ICONS.chart,
      },
      {
        to: PATHS.aboutProperty,
        labelKey: 'nav.aboutProperty',
        icon: GUEST_NAV_ICONS.info,
      },
      {
        to: PATHS.interests,
        labelKey: 'nav.interests',
        icon: GUEST_NAV_ICONS.map,
      },
      {
        to: PATHS.extras,
        labelKey: 'nav.extras',
        icon: GUEST_NAV_ICONS.star,
      },
      {
        to: PATHS.services,
        labelKey: 'nav.services',
        icon: GUEST_NAV_ICONS.users,
      },
      {
        to: PATHS.settings,
        labelKey: 'nav.settings',
        icon: GUEST_NAV_ICONS.settings,
      },
    ]
  }, [isAdmin])

  return {
    items,
    pendingOrdersBadge,
    pendingOrdersCount,
    isAdmin,
  }
}
