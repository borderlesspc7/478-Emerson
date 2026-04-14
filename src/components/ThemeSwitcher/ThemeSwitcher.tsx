import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  applyThemeMode,
  getSavedThemeMode,
  saveThemeMode,
  type ThemeMode,
} from '../../theme/theme'
import './ThemeSwitcher.css'

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getSavedThemeMode())

  useEffect(() => {
    applyThemeMode(themeMode)
    saveThemeMode(themeMode)
  }, [themeMode])

  return (
    <div className="theme-switcher" role="group" aria-label={t('settings.theme')}>
      <span className="theme-switcher__label">{t('settings.theme')}</span>
      <div className="theme-switcher__buttons">
        <button
          type="button"
          className={`theme-switcher__btn ${themeMode === 'dark' ? 'is-active' : ''}`}
          onClick={() => setThemeMode('dark')}
        >
          {t('settings.themeDark')}
        </button>
        <button
          type="button"
          className={`theme-switcher__btn ${themeMode === 'light' ? 'is-active' : ''}`}
          onClick={() => setThemeMode('light')}
        >
          {t('settings.themeLight')}
        </button>
        <button
          type="button"
          className={`theme-switcher__btn ${themeMode === 'system' ? 'is-active' : ''}`}
          onClick={() => setThemeMode('system')}
        >
          {t('settings.themeSystem')}
        </button>
      </div>
    </div>
  )
}
