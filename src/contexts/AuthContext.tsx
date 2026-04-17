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
  logout,
  registerWithEmail,
  subscribeAuth,
} from '../services/authService'
import { mockGuestStay } from '../data/mockGuestStay'
import {
  clearGuestSession,
  findGuestAccessByReservation,
  getGuestSessionReservationCode,
  saveGuestSession,
} from '../lib/guestAccess'
import type { AppUser } from '../types/user'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  user: AppUser | null
  status: AuthStatus
  authReady: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithReservation: (reservationCode: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  lastError: string | null
  clearError: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

function toIsoBoundary(date: string, endOfDay: boolean): string {
  return `${date}T${endOfDay ? '23:59:59' : '00:00:00'}`
}

function buildGuestUserFromReservation(reservationCode: string): AppUser | null {
  const access = findGuestAccessByReservation(reservationCode)
  if (!access) return null

  return {
    uid: `guest-${access.reservationCode}`,
    role: 'guest',
    email: null,
    displayName: `Hóspede ${access.reservationCode}`,
    photoURL: null,
    reservationCode: access.reservationCode,
    stay: {
      checkInAt: toIsoBoundary(access.startDate, false),
      checkOutAt: toIsoBoundary(access.endDate, true),
      propertyName: mockGuestStay.property.name,
      unit: mockGuestStay.property.unit,
    },
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const guestReservation = getGuestSessionReservationCode()
    if (guestReservation) {
      const guestUser = buildGuestUserFromReservation(guestReservation)
      if (guestUser) {
        setUser(guestUser)
        setAuthReady(true)
        return () => {}
      }
      clearGuestSession()
    }

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

  const handleLogin = useCallback(async (email: string, password: string) => {
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

  const handleReservationLogin = useCallback(async (reservationCode: string) => {
    setLastError(null)
    const guestUser = buildGuestUserFromReservation(reservationCode)
    if (!guestUser) {
      const error = new Error('reservation/not-found')
      setLastError(firebaseErrorToMessage('reservation/not-found'))
      throw error
    }

    saveGuestSession(guestUser.reservationCode ?? reservationCode)
    setUser(guestUser)
    setAuthReady(true)
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
    if (user?.role === 'guest') {
      clearGuestSession()
      setUser(null)
      return
    }
    await logout()
  }, [user?.role])

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
      login: handleLogin,
      loginWithReservation: handleReservationLogin,
      register: handleRegister,
      logout: handleLogout,
      lastError,
      clearError,
    }),
    [
      user,
      status,
      authReady,
      handleLogin,
      handleReservationLogin,
      handleRegister,
      handleLogout,
      lastError,
      clearError,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
