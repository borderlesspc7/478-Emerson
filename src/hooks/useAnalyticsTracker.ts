import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import {
  trackAnalyticsEvent,
  trackLocalePreference,
  trackPwaInstallEvent,
} from '../services/analyticsEventsFirestore'

const SESSION_START_KEY = 'zen_analytics_session_start_v1'

function readSessionStart(): number | null {
  try {
    const raw = sessionStorage.getItem(SESSION_START_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeSessionStart(ts: number): void {
  try {
    sessionStorage.setItem(SESSION_START_KEY, String(ts))
  } catch {
    /* ignore */
  }
}

function clearSessionStart(): void {
  try {
    sessionStorage.removeItem(SESSION_START_KEY)
  } catch {
    /* ignore */
  }
}

export function useAnalyticsTracker() {
  const { user } = useAuth()
  const { i18n } = useTranslation()
  const location = useLocation()
  const lastPathRef = useRef<string | null>(null)
  const lastLocaleRef = useRef<string | null>(null)
  const pwaTrackedRef = useRef(false)

  useEffect(() => {
    if (!user?.uid || user.role === 'admin') return
    writeSessionStart(Date.now())
  }, [user?.uid, user?.role])

  useEffect(() => {
    if (!user?.uid || user.role === 'admin') return
    const path = location.pathname
    if (lastPathRef.current === path) return
    lastPathRef.current = path
    void trackAnalyticsEvent({
      userId: user.uid,
      type: 'page_view',
      path,
      reservationCode: user.reservationCode ?? undefined,
    })
  }, [location.pathname, user?.uid, user?.role, user?.reservationCode])

  useEffect(() => {
    if (!user?.uid || user.role === 'admin') return
    const uid = user.uid
    const reservationCode = user.reservationCode ?? undefined

    function flushSession() {
      const started = readSessionStart()
      if (!started) return
      const durationMinutes = (Date.now() - started) / 60_000
      if (durationMinutes < 0.25) return
      void trackAnalyticsEvent({
        userId: uid,
        type: 'session_end',
        durationMinutes,
        reservationCode,
      })
      clearSessionStart()
    }

    function onVisibility() {
      if (document.visibilityState === 'hidden') flushSession()
    }

    window.addEventListener('pagehide', flushSession)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flushSession)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [user?.uid, user?.role, user?.reservationCode])

  useEffect(() => {
    if (!user?.uid || user.role === 'admin') return
    const lang = i18n.language
    if (lastLocaleRef.current === lang) return
    lastLocaleRef.current = lang
    void trackLocalePreference(user.uid, lang)
  }, [user?.uid, user?.role, i18n.language])

  useEffect(() => {
    if (!user?.uid || user.role === 'admin' || pwaTrackedRef.current) return
    const uid = user.uid

    function onInstalled() {
      if (pwaTrackedRef.current) return
      pwaTrackedRef.current = true
      void trackPwaInstallEvent(uid)
    }

    window.addEventListener('appinstalled', onInstalled)
    return () => window.removeEventListener('appinstalled', onInstalled)
  }, [user?.uid, user?.role])
}
