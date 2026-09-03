import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isBeforeCheckInTime } from '../lib/auth'
import { useAuth } from './useAuth'
import { useGuestAccessSettings } from './useGuestEarlyCheckInAccess'
import { resolveAccessReleaseAt } from '../lib/guestAccessRelease'
import { PATHS } from '../routes/path'

const POLL_MS = 15_000

/**
 * Hóspede em pré-check-in: quando o horário de check-in chegar, redireciona para o painel completo.
 */
export function usePreCheckInUnlockMonitor(): void {
  const { user, authReady } = useAuth()
  const navigate = useNavigate()
  const accessSettings = useGuestAccessSettings(user)

  useEffect(() => {
    if (!authReady) return
    if (user?.role !== 'guest') return
    if (accessSettings.earlyCheckInAccess) return
    const stay = user.stay
    if (!stay?.checkInAt || !stay?.checkOutAt) return
    const accessStay = {
      ...stay,
      checkInAt: resolveAccessReleaseAt(stay.checkInAt, accessSettings.accessReleaseTime),
    }
    if (!isBeforeCheckInTime(accessStay)) return

    const unlock = () => {
      if (!isBeforeCheckInTime(accessStay)) {
        navigate(PATHS.dashboard, { replace: true })
      }
    }

    unlock()
    const id = window.setInterval(unlock, POLL_MS)
    return () => window.clearInterval(id)
  }, [
    authReady,
    user,
    navigate,
    accessSettings.earlyCheckInAccess,
    accessSettings.accessReleaseTime,
  ])
}
