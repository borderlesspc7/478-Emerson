import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import i18n from '../i18n/i18n'
import { clearGuestSession } from '../lib/guestAccess'
import { getFirebaseAuth } from '../lib/firebase'
import { trackGuestLoginMethod } from '../services/analyticsEventsFirestore'
import { resolveAuthErrorMessage } from '../lib/resolveAuthErrorMessage'
import {
  firebaseErrorToMessage,
  GUEST_APP_DEFAULT_PASSWORD,
  loginWithEmail,
  loginWithStaysReservation,
  logout,
  registerWithEmail,
  subscribeAuth,
} from '../services/authService'
import { StaysApiError } from '../services/staysClient'
import type { AppUser } from '../types/user'

type AuthContextValue = {
  user: AppUser | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  authReady: boolean
  /** Hóspede: código da reserva Stays (a senha JIT é aplicada internamente). */
  loginGuest: (
    reservationCode: string,
    options?: { loginMethod?: 'magic' | 'manual' },
  ) => Promise<void>
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

  const handleGuestLogin = useCallback(
    async (reservationCode: string, options?: { loginMethod?: 'magic' | 'manual' }) => {
    setLastError(null)
    try {
      await loginWithStaysReservation(reservationCode, GUEST_APP_DEFAULT_PASSWORD)
      const uid = getFirebaseAuth()?.currentUser?.uid
      if (uid && options?.loginMethod) {
        void trackGuestLoginMethod(uid, options.loginMethod, reservationCode)
      }
    } catch (e: unknown) {
      if (e instanceof StaysApiError) {
        const msg =
          e.code === 'stays/not-configured'
            ? firebaseErrorToMessage('stays/not-configured')
            : e.message
        setLastError(msg)
        throw e
      }
      setLastError(resolveAuthErrorMessage(e, i18n.t.bind(i18n), i18n.language))
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
