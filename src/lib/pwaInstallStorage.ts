export const PWA_DISMISS_STORAGE_KEY = 'guest-guide:pwa-install-dismissed'
export const PWA_INSTALLED_STORAGE_KEY = 'guest-guide:pwa-install-installed'

export function isPwaInstallDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(PWA_DISMISS_STORAGE_KEY) === '1'
}

export function markPwaInstallDismissed(): void {
  window.localStorage.setItem(PWA_DISMISS_STORAGE_KEY, '1')
}

export function isPwaMarkedInstalled(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === '1'
}

export function markPwaInstalled(): void {
  window.localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, '1')
}
