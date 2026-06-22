import { useTranslation } from 'react-i18next'
import { LocaleSwitcher } from '../../components/LocaleSwitcher/LocaleSwitcher'
import { PushNotificationToggle } from '../../components/PushNotificationToggle/PushNotificationToggle'
import { ThemeSwitcher } from '../../components/ThemeSwitcher/ThemeSwitcher'
import { useAuth } from '../../hooks/useAuth'
import '../shared/guestContent.css'
import '../PlaceholderPage.css'

export function GuestSettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isGuest = user?.role === 'guest'

  return (
    <div className="page-placeholder">
      <h2 className="page-placeholder__title">{t('placeholders.settingsTitle')}</h2>
      <p className="page-placeholder__text">{t('placeholders.settingsDesc')}</p>
      <ThemeSwitcher />
      <LocaleSwitcher />
      {isGuest ? <PushNotificationToggle /> : null}
    </div>
  )
}
