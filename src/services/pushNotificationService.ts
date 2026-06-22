import { getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { getFirebaseMessaging } from '../lib/firebase'

function getVapidKey(): string | null {
  const key = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!key || !String(key).trim()) return null
  return String(key).trim()
}

export async function isPushNotificationSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (!('serviceWorker' in navigator)) return false
  const messaging = await getFirebaseMessaging()
  return messaging !== null && getVapidKey() !== null
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

async function resolveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

export async function fetchFcmRegistrationToken(): Promise<string | null> {
  const messaging = await getFirebaseMessaging()
  const vapidKey = getVapidKey()
  if (!messaging || !vapidKey) return null

  const registration = await resolveServiceWorkerRegistration()
  if (!registration) return null

  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  })
}

export async function subscribeForegroundMessages(
  handler: (payload: MessagePayload) => void,
): Promise<(() => void) | null> {
  const messaging = await getFirebaseMessaging()
  if (!messaging) return null
  return onMessage(messaging, handler)
}
