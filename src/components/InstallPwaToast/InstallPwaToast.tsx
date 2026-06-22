import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiDownload, FiX } from 'react-icons/fi'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import { PATHS } from '../../routes/path'
import { Button } from '../ui/Button/Button'
import './InstallPwaToast.css'

export function InstallPwaToast() {
  const { t } = useTranslation()
  const { user, authReady } = useAuth()
  const { pathname } = useLocation()
  const isMobileViewport = useMediaQuery('(max-width: 1023px)')
  const {
    isInstallAvailable,
    isIOS,
    isAndroid,
    shouldShowBanner,
    promptToInstall,
    dismissBanner,
  } = usePWAInstall()

  const stackClassName = useMemo(() => {
    const classes = ['install-pwa-toast-stack']
    if (!isMobileViewport) return classes.join(' ')

    const inAppShell =
      authReady &&
      user &&
      pathname !== PATHS.login &&
      pathname !== PATHS.preCheckIn &&
      !pathname.startsWith(`${PATHS.guestDirectEntry}/`) &&
      pathname !== PATHS.accessExpired

    if (inAppShell) {
      classes.push('install-pwa-toast-stack--above-nav')
    }

    return classes.join(' ')
  }, [authReady, isMobileViewport, pathname, user])

  if (!shouldShowBanner) return null

  return (
    <div className={stackClassName} role="region" aria-label={t('pwa.installBannerAria')}>
      <div className="install-pwa-toast">
        <p className="install-pwa-toast__message">{t('pwa.toastMessage')}</p>

        {isIOS && !isInstallAvailable ? (
          <p className="install-pwa-toast__hint">{t('pwa.toastIosHint')}</p>
        ) : null}

        {isAndroid && !isInstallAvailable ? (
          <p className="install-pwa-toast__hint">{t('pwa.toastAndroidHint')}</p>
        ) : null}

        <div className="install-pwa-toast__actions">
          {isInstallAvailable ? (
            <Button
              variant="primary"
              size="sm"
              type="button"
              leftIcon={<FiDownload aria-hidden />}
              onClick={() => void promptToInstall()}
            >
              {t('pwa.installButton')}
            </Button>
          ) : null}
          <button
            type="button"
            className="install-pwa-toast__dismiss"
            onClick={dismissBanner}
          >
            {t('pwa.dismiss')}
          </button>
          <button
            type="button"
            className="install-pwa-toast__close"
            onClick={dismissBanner}
            aria-label={t('pwa.dismiss')}
          >
            <FiX aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
