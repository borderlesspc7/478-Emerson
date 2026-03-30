import { useTranslation } from 'react-i18next'
import { setAppLanguage } from '../../i18n/i18n'
import './LocaleSwitcher.css'

export function LocaleSwitcher() {
  const { i18n, t } = useTranslation()

  return (
    <div className="locale-switcher" role="group" aria-label={t('settings.language')}>
      <span className="locale-switcher__label">{t('settings.language')}</span>
      <div className="locale-switcher__buttons">
        <button
          type="button"
          className={`locale-switcher__btn ${i18n.language === 'pt' ? 'is-active' : ''}`}
          onClick={() => setAppLanguage('pt')}
        >
          {t('settings.pt')}
        </button>
        <button
          type="button"
          className={`locale-switcher__btn ${i18n.language === 'en' ? 'is-active' : ''}`}
          onClick={() => setAppLanguage('en')}
        >
          {t('settings.en')}
        </button>
      </div>
    </div>
  )
}
