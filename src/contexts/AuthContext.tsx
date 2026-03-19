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
  subscribeAuth
} from '../services/authService'
import type { AppUser } from '../types/user'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

type AuthContextValue = {
  user: AppUser | null
  status: AuthStatus
  authReady: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  lastError: string | null
  clearError: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeAuth(
      (nextUser) => {
        setUser(nextUser)
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

  const handleLogout = useCallback(async () => {
    setLastError(null)
    await logout()
  }, [])

  const clearError = useCallback(() => {
    setLastError(null)
  }, [])

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
      logout: handleLogout,
      lastError,
      clearError,
    }),
    [user, status, authReady, handleLogin, handleLogout, lastError, clearError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
