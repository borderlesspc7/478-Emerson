import type { NavigationType } from 'react-router-dom'
import { PATHS } from '../../routes/path'

/** Ordered flow used to infer forward/back for tab-like transitions. */
export const ROUTE_FLOW: string[] = [
  PATHS.dashboard,
  PATHS.reservation,
  PATHS.aboutProperty,
  PATHS.interests,
  PATHS.extras,
  PATHS.services,
  PATHS.settings,
  PATHS.admin,
  PATHS.adminOrders,
  PATHS.adminAnalytics,
  PATHS.adminServices,
  PATHS.adminProperties,
  PATHS.adminAccess,
]

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

function flowIndex(pathname: string): number {
  const path = normalizePath(pathname)
  const exact = ROUTE_FLOW.indexOf(path)
  if (exact >= 0) return exact

  if (path.startsWith(`${PATHS.adminProperties}/`)) {
    return ROUTE_FLOW.indexOf(PATHS.adminProperties) + 0.5
  }

  if (path.startsWith(`${PATHS.admin}/`)) {
    return ROUTE_FLOW.indexOf(PATHS.admin)
  }

  return ROUTE_FLOW.length
}

export function getTransitionDirection(
  from: string,
  to: string,
  type: NavigationType,
): 1 | -1 {
  if (type === 'POP') return -1
  const fromIdx = flowIndex(from)
  const toIdx = flowIndex(to)
  return toIdx >= fromIdx ? 1 : -1
}

/**
 * Collapse nested admin routes so the shell outlet stays stable
 * while AdminLayout's inner outlet animates tab changes.
 */
export function resolveTransitionKey(pathname: string, scope: 'section' | 'full'): string {
  const path = normalizePath(pathname)
  if (scope === 'full') return path

  if (path === PATHS.admin || path.startsWith(`${PATHS.admin}/`)) {
    return PATHS.admin
  }
  return path
}
