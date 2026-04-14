export type ThemeMode = 'system' | 'light' | 'dark'

const THEME_STORAGE_KEY = 'guest-guide:theme-mode'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function getSavedThemeMode(): ThemeMode {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(saved) ? saved : 'system'
}

export function saveThemeMode(mode: ThemeMode): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, mode)
}

export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === 'system') {
    root.removeAttribute('data-theme')
    return
  }

  root.setAttribute('data-theme', mode)
}
