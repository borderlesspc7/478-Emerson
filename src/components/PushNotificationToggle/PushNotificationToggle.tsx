import { useTranslation } from 'react-i18next'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import './PushNotificationToggle.css'

export function PushNotificationToggle() {
  const { t } = useTranslation()
  const { isSupported, permission, enabled, loading, error, enable, disable } =
    usePushNotifications()

  if (!isSupported) {
    return (
      <div className="push-toggle">
        <p className="push-toggle__label">{t('settings.pushNotifications')}</p>
        <p className="push-toggle__hint">{t('settings.pushNotSupported')}</p>
      </div>
    )
  }

  async function handleChange(next: boolean) {
    if (loading) return
    if (next) {
      await enable()
    } else {
      await disable()
    }
  }

  const hintKey =
    error === 'push/permission-denied'
      ? 'settings.pushPermissionDenied'
      : error
        ? 'settings.pushError'
        : permission === 'granted' && enabled
          ? 'settings.pushEnabledHint'
          : 'settings.pushDisabledHint'

  return (
    <div className="push-toggle">
      <div className="push-toggle__row">
        <div>
          <p className="push-toggle__label">{t('settings.pushNotifications')}</p>
          <p className="push-toggle__hint">{t(hintKey)}</p>
        </div>
        <label className="push-toggle__switch">
          <input
            type="checkbox"
            checked={enabled}
            disabled={loading || permission === 'denied'}
            onChange={(e) => void handleChange(e.target.checked)}
            aria-label={t('settings.pushNotifications')}
          />
          <span className="push-toggle__slider" aria-hidden />
        </label>
      </div>
    </div>
  )
}
