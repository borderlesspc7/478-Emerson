import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { PATHS } from '../routes/path'

const POLL_MS = 30_000

/**
 * Hóspede: após o horário de check-out da Stays, limpa storage, termina sessão Firebase e envia para /acesso-expirado.
 */
export function useGuestStayExpiryMonitor(): void {
  const { user, logout, authReady } = useAuth()
  const navigate = useNavigate()
  const logoutRef = useRef(logout)

  useEffect(() => {
    logoutRef.current = logout
  }, [logout])

  useEffect(() => {
    if (!authReady) return
    if (user?.role !== 'guest') return
    const out = user.stay?.checkOutAt
    if (!out) return

    const run = async () => {
      const end = new Date(out).getTime()
      if (Number.isNaN(end) || Date.now() <= end) return
      try {
        window.localStorage.clear()
        window.sessionStorage.clear()
      } catch {
        /* ignore */
      }
      try {
        await logoutRef.current()
      } catch {
        /* ignore */
      }
      navigate(PATHS.accessExpired, { replace: true })
    }

    void run()
    const id = window.setInterval(() => void run(), POLL_MS)
    return () => window.clearInterval(id)
  }, [authReady, user, navigate])
}
