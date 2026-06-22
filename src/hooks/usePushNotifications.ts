import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from './useAuth'
import {
  deactivateFcmTokensForUser,
  saveFcmTokenForUser,
} from '../services/fcmTokenFirestore'
import {
  fetchFcmRegistrationToken,
  getNotificationPermission,
  isPushNotificationSupported,
  requestNotificationPermission,
  subscribeForegroundMessages,
} from '../services/pushNotificationService'
import {
  fetchPushNotificationsEnabled,
  setPushNotificationsEnabled,
} from '../services/userProfileFirestore'

export type UsePushNotificationsResult = {
  isSupported: boolean
  permission: NotificationPermission
  enabled: boolean
  loading: boolean
  error: string | null
  enable: () => Promise<boolean>
  disable: () => Promise<void>
}

export function usePushNotifications(): UsePushNotificationsResult {
  const { user } = useAuth()
  const { showToast } = useToast()
  const uid = user?.uid
  const isGuest = user?.role === 'guest'

  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const syncingRef = useRef(false)

  const refreshState = useCallback(async () => {
    if (!uid || !isGuest) {
      setEnabled(false)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const supported = await isPushNotificationSupported()
      setIsSupported(supported)
      const perm = await getNotificationPermission()
      setPermission(perm)
      const pref = await fetchPushNotificationsEnabled(uid)
      setEnabled(pref && perm === 'granted' && supported)
      setError(null)
    } catch {
      setError('push/load-failed')
    } finally {
      setLoading(false)
    }
  }, [uid, isGuest])

  useEffect(() => {
    void refreshState()
  }, [refreshState])

  const syncToken = useCallback(async (): Promise<boolean> => {
    if (!uid || syncingRef.current) return false
    syncingRef.current = true
    try {
      const token = await fetchFcmRegistrationToken()
      if (!token) {
        setError('push/token-unavailable')
        return false
      }
      await saveFcmTokenForUser(uid, token)
      setError(null)
      return true
    } catch {
      setError('push/token-save-failed')
      return false
    } finally {
      syncingRef.current = false
    }
  }, [uid])

  const enable = useCallback(async (): Promise<boolean> => {
    if (!uid || !isGuest) return false

    const supported = await isPushNotificationSupported()
    if (!supported) {
      setError('push/not-supported')
      return false
    }

    const perm = await requestNotificationPermission()
    setPermission(perm)
    if (perm !== 'granted') {
      setError('push/permission-denied')
      setEnabled(false)
      await setPushNotificationsEnabled(uid, false)
      return false
    }

    const saved = await syncToken()
    if (!saved) return false

    await setPushNotificationsEnabled(uid, true)
    setEnabled(true)
    setError(null)
    return true
  }, [uid, isGuest, syncToken])

  const disable = useCallback(async (): Promise<void> => {
    if (!uid) return
    await deactivateFcmTokensForUser(uid)
    await setPushNotificationsEnabled(uid, false)
    setEnabled(false)
    setError(null)
  }, [uid])

  useEffect(() => {
    if (!enabled || !uid) return

    let unsubscribe: (() => void) | null = null
    let cancelled = false

    void subscribeForegroundMessages((payload) => {
      const title = payload.notification?.title
      const body = payload.notification?.body
      if (title || body) {
        showToast(body ? `${title}: ${body}` : (title as string))
      }
    }).then((unsub) => {
      if (cancelled) {
        unsub?.()
        return
      }
      unsubscribe = unsub
    })

    const onFocus = () => {
      void syncToken()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      unsubscribe?.()
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, uid, showToast, syncToken])

  return {
    isSupported,
    permission,
    enabled,
    loading,
    error,
    enable,
    disable,
  }
}
