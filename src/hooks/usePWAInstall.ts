import { useCallback, useEffect, useState } from 'react'

const DISMISS_STORAGE_KEY = 'guest-guide:pwa-install-dismissed'

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(DISMISS_STORAGE_KEY) === '1'
}

export function usePWAInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [isStandalone, setIsStandalone] = useState(isStandaloneDisplay)
  const [isIOS] = useState(isIOSDevice)
  const [isDismissedBanner, setIsDismissedBanner] = useState(isDismissed)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault()
      setInstallEvent(event)
    }

    function handleAppInstalled() {
      setInstallEvent(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptToInstall = useCallback(async () => {
    if (!installEvent) return

    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice

    if (outcome === 'accepted') {
      setInstallEvent(null)
    }
  }, [installEvent])

  const dismissBanner = useCallback(() => {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, '1')
    setIsDismissedBanner(true)
  }, [])

  const isInstallAvailable = installEvent !== null
  const shouldShowBanner =
    !isStandalone &&
    !isDismissedBanner &&
    (isInstallAvailable || isIOS)

  return {
    isInstallAvailable,
    isIOS,
    isStandalone,
    shouldShowBanner,
    promptToInstall,
    dismissBanner,
  }
}
