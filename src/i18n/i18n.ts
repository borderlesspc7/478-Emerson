import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../locales/en.json'
import pt from '../locales/pt.json'

const STORAGE_KEY = 'i18n-lang'

function initialLanguage(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'pt' || stored === 'en') return stored
  } catch {
    /* private mode etc. */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'pt'
  return nav.toLowerCase().startsWith('en') ? 'en' : 'pt'
}

void i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    en: { translation: en },
  },
  lng: initialLanguage(),
  fallbackLng: 'pt',
  interpolation: { escapeValue: false },
})

export function setAppLanguage(lng: 'pt' | 'en') {
  void i18n.changeLanguage(lng)
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    /* ignore */
  }
}

export default i18n
