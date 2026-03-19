import type { ReactNode } from 'react'
import { AuthProvider } from './contexts/AuthContext'

export function Auth({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
