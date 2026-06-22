import type { ReactNode } from 'react'
import { InstallPwaToast } from './components/InstallPwaToast/InstallPwaToast'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'

export function Auth({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <InstallPwaToast />
        {children}
      </ToastProvider>
    </AuthProvider>
  )
}
