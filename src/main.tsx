import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './i18n/i18n'
import './index.css'
import App from './App.tsx'
import { applyThemeMode, getSavedThemeMode } from './theme/theme'

applyThemeMode(getSavedThemeMode())

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegistered(registration) {
      console.info('[PWA] Service worker registered', registration?.scope)
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed', error)
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
