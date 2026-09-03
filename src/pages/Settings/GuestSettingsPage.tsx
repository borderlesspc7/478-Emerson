import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button'
import { LocaleSwitcher } from '../../components/LocaleSwitcher/LocaleSwitcher'
import { PushNotificationToggle } from '../../components/PushNotificationToggle/PushNotificationToggle'
import { ThemeSwitcher } from '../../components/ThemeSwitcher/ThemeSwitcher'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/path'
import '../shared/guestContent.css'
import './GuestSettingsPage.css'

export function GuestSettingsPage() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const [logoutLoading, setLogoutLoading] = useState(false)
  const isGuest = user?.role === 'guest'

  async function handleLogout() {
    setLogoutLoading(true)
    try {
      await logout()
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <div className="guest-settings">
      <h2 className="guest-settings__title">{t('settings.title')}</h2>
      <p className="guest-settings__lead">{t('settings.desc')}</p>

      {user ? (
        <section className="guest-settings__block" aria-labelledby="settings-account">
          <h3 id="settings-account" className="guest-settings__label">
            {t('settings.account')}
          </h3>
          <p className="guest-settings__value">
            {isGuest
              ? t('settings.accountGuest', {
                  code: user.reservationCode ?? '—',
                })
              : t('settings.accountAdmin', {
                  email: user.email ?? '—',
                })}
          </p>
        </section>
      ) : null}

      <section className="guest-settings__block" aria-labelledby="settings-preferences">
        <h3 id="settings-preferences" className="guest-settings__label">
          {t('settings.preferences')}
        </h3>
        <ThemeSwitcher />
        <LocaleSwitcher />
        {isGuest ? <PushNotificationToggle /> : null}
      </section>

      <section className="guest-settings__block" aria-labelledby="settings-legal">
        <h3 id="settings-legal" className="guest-settings__label">
          {t('settings.legal')}
        </h3>
        <nav className="guest-settings__links" aria-label={t('settings.legal')}>
          <Link to={PATHS.terms}>{t('settings.termsLink')}</Link>
          <Link to={PATHS.privacy}>{t('settings.privacyLink')}</Link>
        </nav>
      </section>

      <div className="guest-settings__actions">
        <Button
          type="button"
          variant="secondary"
          size="md"
          loading={logoutLoading}
          onClick={() => void handleLogout()}
        >
          {t('settings.logout')}
        </Button>
      </div>
    </div>
  )
}
