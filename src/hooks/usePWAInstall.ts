import { useCallback, useEffect, useState } from 'react'
import {
  isPwaInstallDismissed,
  isPwaMarkedInstalled,
  markPwaInstallDismissed,
  markPwaInstalled,
} from '../lib/pwaInstallStorage'

const PROMPT_DELAY_MS = 600

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  if (/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true
  }
  const narrow = window.matchMedia('(max-width: 767px)').matches
  const touch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  return narrow && touch
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

export function usePWAInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(isStandaloneDisplay)
  const [isMobile] = useState(isMobileDevice)
  const [isIOS] = useState(isIOSDevice)
  const [isAndroid] = useState(isAndroidDevice)
  const [isDismissedBanner, setIsDismissedBanner] = useState(isPwaInstallDismissed)
  const [isMarkedInstalled, setIsMarkedInstalled] = useState(isPwaMarkedInstalled)
  const [deferReady, setDeferReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDeferReady(true), PROMPT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault()
      setInstallEvent(event)
    }

    function handleAppInstalled() {
      setInstallEvent(null)
      setIsStandalone(true)
      markPwaInstalled()
      setIsMarkedInstalled(true)
    }

    function handleDisplayModeChange() {
      if (isStandaloneDisplay()) {
        setIsStandalone(true)
        markPwaInstalled()
        setIsMarkedInstalled(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    const displayMq = window.matchMedia('(display-mode: standalone)')
    displayMq.addEventListener('change', handleDisplayModeChange)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      displayMq.removeEventListener('change', handleDisplayModeChange)
    }
  }, [])

  const promptToInstall = useCallback(async () => {
    if (!installEvent) return false

    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice

    if (outcome === 'accepted') {
      setInstallEvent(null)
      markPwaInstalled()
      setIsMarkedInstalled(true)
      return true
    }

    return false
  }, [installEvent])

  const dismissBanner = useCallback(() => {
    markPwaInstallDismissed()
    setIsDismissedBanner(true)
  }, [])

  const isInstallAvailable = installEvent !== null
  const showManualHint = isIOS || (isAndroid && !isInstallAvailable)

  const shouldShowBanner =
    isMobile &&
    deferReady &&
    !isStandalone &&
    !isDismissedBanner &&
    !isMarkedInstalled &&
    (isInstallAvailable || showManualHint)

  return {
    isInstallAvailable,
    isIOS,
    isAndroid,
    isMobile,
    isStandalone,
    shouldShowBanner,
    showManualHint,
    promptToInstall,
    dismissBanner,
  }
}
