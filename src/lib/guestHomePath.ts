import type { AppUser } from '../types/user'
import { isGuestPreCheckInLocked, isStayCheckOutExpired } from './auth'
import { PATHS } from '../routes/path'
import { resolveAccessReleaseAt } from './guestAccessRelease'

/** Destino inicial do hóspede conforme a janela da estadia. */
export function getGuestHomePath(user: AppUser | null | undefined): string {
  if (user?.role !== 'guest') return PATHS.dashboard
  const stay = user.stay
  if (!stay?.checkInAt || !stay?.checkOutAt) return PATHS.dashboard
  if (isStayCheckOutExpired(stay)) return PATHS.accessExpired
  const accessStay = {
    ...stay,
    checkInAt: resolveAccessReleaseAt(stay.checkInAt, user.accessReleaseTime),
  }
  if (isGuestPreCheckInLocked(accessStay, { earlyCheckInAccess: user.earlyCheckInAccess })) {
    return PATHS.preCheckIn
  }
  return PATHS.dashboard
}
