import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/i18n'
import './index.css'
import App from './App.tsx'
import { applyThemeMode, getSavedThemeMode } from './theme/theme'

applyThemeMode(getSavedThemeMode())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
