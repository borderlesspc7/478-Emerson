import { useTranslation } from 'react-i18next'
import { FiDownload, FiShare2, FiX } from 'react-icons/fi'
import { usePWAInstall } from '../../hooks/usePWAInstall'
import { Button } from '../ui/Button/Button'
import './PWAInstallBanner.css'

export function PWAInstallBanner() {
  const { t } = useTranslation()
  const {
    isInstallAvailable,
    isIOS,
    shouldShowBanner,
    promptToInstall,
    dismissBanner,
  } = usePWAInstall()

  if (!shouldShowBanner) return null

  return (
    <div
      className="pwa-install-banner"
      role="region"
      aria-label={t('pwa.installBannerAria')}
    >
      <div className="pwa-install-banner__content">
        <p className="pwa-install-banner__message">
          {t('pwa.installBannerMessage')}
        </p>

        {isIOS && !isInstallAvailable ? (
          <p className="pwa-install-banner__ios-hint">
            {t('pwa.iosHint')}{' '}
            <span className="pwa-install-banner__share-icon" aria-hidden>
              <FiShare2 />
            </span>{' '}
            {t('pwa.iosHintSuffix')}
          </p>
        ) : null}
      </div>

      <div className="pwa-install-banner__actions">
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
          className="pwa-install-banner__dismiss"
          onClick={dismissBanner}
          aria-label={t('pwa.dismiss')}
        >
          <FiX aria-hidden />
        </button>
      </div>
    </div>
  )
}
