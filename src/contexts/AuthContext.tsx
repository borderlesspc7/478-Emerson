import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  firebaseErrorToMessage,
  loginWithEmail,
  loginWithStaysReservation,
  logout,
  registerWithEmail,
  subscribeAuth,
} from '../services/authService'
import { StaysApiError } from '../services/staysClient'
import { clearGuestSession } from '../lib/guestAccess'
import type { AppUser } from '../types/user'

type AuthContextValue = {
  user: AppUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  authReady: boolean
  /** Hóspede: código da reserva Stays + senha padrão (Firebase JIT). */
  loginGuest: (reservationCode: string, password: string) => Promise<void>
  /** Admin: e-mail e senha corporativos. */
  loginAdmin: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  lastError: string | null
  clearError: () => void
}

export type AuthStatus = AuthContextValue['status']

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeAuth(
      (u) => {
        setUser(u)
        setAuthReady(true)
      },
      () => {
        setUser(null)
        setAuthReady(true)
      }
    )
    return unsub
  }, [])

  const handleGuestLogin = useCallback(async (reservationCode: string, password: string) => {
    setLastError(null)
    try {
      await loginWithStaysReservation(reservationCode, password)
    } catch (e: unknown) {
      if (e instanceof StaysApiError) {
        const msg =
          e.code === 'stays/not-configured'
            ? firebaseErrorToMessage('stays/not-configured')
            : e.message
        setLastError(msg)
        throw e
      }
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code: string }).code)
          : e instanceof Error
          ? e.message
          : 'unknown'
      setLastError(firebaseErrorToMessage(code))
      throw e
    }
  }, [])

  const handleAdminLogin = useCallback(async (email: string, password: string) => {
    setLastError(null)
    try {
      await loginWithEmail(email, password)
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code: string }).code)
          : e instanceof Error
          ? e.message
          : 'unknown'
      setLastError(firebaseErrorToMessage(code))
      throw e
    }
  }, [])

  const handleRegister = useCallback(async (email: string, password: string) => {
    setLastError(null)
    try {
      await registerWithEmail(email, password)
    } catch (e: unknown) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code: string }).code)
          : e instanceof Error
          ? e.message
          : 'unknown'
      setLastError(firebaseErrorToMessage(code))
      throw e
    }
  }, [])

  const handleLogout = useCallback(async () => {
    setLastError(null)
    clearGuestSession()
    await logout()
  }, [])

  const clearError = useCallback(() => setLastError(null), [])

  const status: AuthStatus = !authReady
    ? 'loading'
    : user
    ? 'authenticated'
    : 'unauthenticated'

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      authReady,
      loginGuest: handleGuestLogin,
      loginAdmin: handleAdminLogin,
      register: handleRegister,
      logout: handleLogout,
      lastError,
      clearError,
    }),
    [
      user,
      status,
      authReady,
      handleGuestLogin,
      handleAdminLogin,
      handleRegister,
      handleLogout,
      lastError,
      clearError,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
