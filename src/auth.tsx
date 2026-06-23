import type { ReactNode } from 'react'
import { InstallPwaToast } from './components/InstallPwaToast/InstallPwaToast'
import { AnalyticsTracker } from './components/AnalyticsTracker/AnalyticsTracker'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'

export function Auth({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AnalyticsTracker />
        <InstallPwaToast />
        {children}
      </ToastProvider>
    </AuthProvider>
  )
}
