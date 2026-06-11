import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { isBeforeCheckInTime } from '../lib/auth'
import { useAuth } from './useAuth'
import { PATHS } from '../routes/path'

const POLL_MS = 15_000

/**
 * Hóspede em pré-check-in: quando o horário de check-in chegar, redireciona para o painel completo.
 */
export function usePreCheckInUnlockMonitor(): void {
  const { user, authReady } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authReady) return
    if (user?.role !== 'guest') return
    const stay = user.stay
    if (!stay?.checkInAt || !stay?.checkOutAt) return
    if (!isBeforeCheckInTime(stay)) return

    const unlock = () => {
      if (!isBeforeCheckInTime(stay)) {
        navigate(PATHS.dashboard, { replace: true })
      }
    }

    unlock()
    const id = window.setInterval(unlock, POLL_MS)
    return () => window.clearInterval(id)
  }, [authReady, user, navigate])
}
