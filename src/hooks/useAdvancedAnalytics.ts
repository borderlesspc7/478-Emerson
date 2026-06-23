import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatAnalyticsDateKey, resolveAnalyticsPeriodRange } from '../lib/analyticsPeriod'
import { useAnalyticsPeriod } from '../contexts/AnalyticsPeriodContext'
import {
  aggregateAnalyticsSnapshots,
  computeLiveAnalytics,
} from '../services/advancedAnalyticsCompute'
import { fetchAnalyticsEventsInRange } from '../services/analyticsEventsFirestore'
import { fetchAnalyticsSnapshotsInRange } from '../services/analyticsSnapshotsFirestore'
import { subscribeGuestAccessLinks } from '../services/guestAccessLinkFirestore'
import { fetchGuestReviewsInRange } from '../services/guestReviewsFirestore'
import { subscribePropertyCurations } from '../services/propertyCurationFirestore'
import { subscribeServiceRequestsForAdmin } from '../services/serviceRequestsFirestore'
import { fetchListings } from '../services/staysService'
import { isFirebaseConfigured } from '../lib/firebase'
import { getFirebaseFirestore } from '../lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import type { AggregatedAnalytics } from '../types/analytics'
import type { GuestAccessLinkRecord } from '../types/guestAccessLink'
import type { PropertyCurationRecord } from '../types/propertyCuration'
import type { ServiceRequestRecord } from '../types/serviceRequest'
import type { StaysPropertyListing } from '../types/staysApi'

const EMPTY_ANALYTICS: AggregatedAnalytics = {
  revenue: {
    totalCents: 0,
    avgTicketCents: 0,
    reservationsWithPurchaseCount: 0,
    byProperty: [],
    topServiceByRevenue: null,
    monthlyProjectionCents: 0,
    dailyTrend: [],
  },
  guests: {
    conversionRate: null,
    avgSessionMinutes: null,
    pageViews: [],
    returnRate: null,
    npsTrend: [],
    npsMovingAvg: null,
    npsReviewCount: 0,
  },
  properties: {
    bySatisfaction: [],
    byRevenue: [],
    occupancyRate: null,
    recurringIssueTags: [],
    curationCompletePercent: null,
    curationComplete: 0,
    curationTotal: 0,
  },
  engagement: {
    pwaInstallRate: null,
    pushOptInRate: null,
    magicLinkPercent: null,
    manualLoginPercent: null,
    localeDistribution: [],
    peakHours: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
  },
  snapshotCount: 0,
  hasLiveFallback: false,
}

async function fetchGuestUsersSummary(): Promise<
  { uid: string; reservationCode: string | null; pushEnabled: boolean }[]
> {
  const db = getFirebaseFirestore()
  if (!db || !isFirebaseConfigured()) return []
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'guest')))
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        uid: d.id,
        reservationCode:
          typeof data.reservationCode === 'string' ? data.reservationCode : null,
        pushEnabled: data.pushNotificationsEnabled === true,
      }
    })
  } catch {
    return []
  }
}

export function useAdvancedAnalytics() {
  const { period } = useAnalyticsPeriod()
  const range = useMemo(() => resolveAnalyticsPeriodRange(period), [period])

  const [guestLinks, setGuestLinks] = useState<GuestAccessLinkRecord[]>([])
  const [requests, setRequests] = useState<ServiceRequestRecord[]>([])
  const [curations, setCurations] = useState<PropertyCurationRecord[]>([])
  const [listings, setListings] = useState<StaysPropertyListing[]>([])
  const [analytics, setAnalytics] = useState<AggregatedAnalytics>(EMPTY_ANALYTICS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    const u1 = subscribeGuestAccessLinks(setGuestLinks)
    const u2 = subscribeServiceRequestsForAdmin(setRequests)
    const u3 = subscribePropertyCurations(setCurations)
    return () => {
      u1()
      u2()
      u3()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchListings()
        if (!cancelled) setListings(list)
      } catch {
        if (!cancelled) setListings([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const todayKey = formatAnalyticsDateKey(new Date())
      const rangeToKey = formatAnalyticsDateKey(range.to)
      const includesToday = rangeToKey >= todayKey

      const [snapshotsResult, eventsResult, reviewsResult, guestUsersResult] =
        await Promise.allSettled([
          fetchAnalyticsSnapshotsInRange(range.from, range.to),
          fetchAnalyticsEventsInRange(range.from, range.to),
          fetchGuestReviewsInRange(range.from, range.to),
          fetchGuestUsersSummary(),
        ])

      const permissionDenied = [snapshotsResult, eventsResult, reviewsResult].some(
        (r) =>
          r.status === 'rejected' &&
          (r.reason as { code?: string })?.code === 'permission-denied',
      )
      if (permissionDenied) {
        setError(
          'Sem permissão no Firestore. Faça deploy das regras (`npm run firebase:deploy:firestore-rules`) e confirme que o utilizador tem role admin em users/{uid}.',
        )
        setAnalytics(EMPTY_ANALYTICS)
        return
      }

      const snapshots =
        snapshotsResult.status === 'fulfilled' ? snapshotsResult.value : []
      const events = eventsResult.status === 'fulfilled' ? eventsResult.value : []
      const reviews = reviewsResult.status === 'fulfilled' ? reviewsResult.value : []
      const guestUsers =
        guestUsersResult.status === 'fulfilled' ? guestUsersResult.value : []

      const snapshotAgg =
        snapshots.length > 0 ? aggregateAnalyticsSnapshots(snapshots) : EMPTY_ANALYTICS

      const activeLinks = guestLinks.filter((l) => l.accessActive).length
      const occupancyRate =
        listings.length > 0 ? (activeLinks / listings.length) * 100 : null

      const liveAgg = computeLiveAnalytics({
        from: includesToday ? new Date(todayKey + 'T00:00:00') : range.from,
        to: range.to,
        requests,
        events,
        reviews,
        guestLinks,
        curations,
        listings,
        guestUsers,
        occupancyRate,
        occupancyBooked: activeLinks,
        occupancyTotal: listings.length,
      })

      if (snapshots.length === 0) {
        const fullLive = computeLiveAnalytics({
          from: range.from,
          to: range.to,
          requests,
          events,
          reviews,
          guestLinks,
          curations,
          listings,
          guestUsers,
          occupancyRate,
          occupancyBooked: activeLinks,
          occupancyTotal: listings.length,
        })
        setAnalytics(fullLive)
      } else if (includesToday) {
        setAnalytics({
          ...aggregateAnalyticsSnapshots(snapshots),
          revenue: {
            ...snapshotAgg.revenue,
            totalCents: snapshotAgg.revenue.totalCents + liveAgg.revenue.totalCents,
            dailyTrend: [...snapshotAgg.revenue.dailyTrend, ...liveAgg.revenue.dailyTrend],
          },
          guests: {
            ...snapshotAgg.guests,
            pageViews:
              liveAgg.guests.pageViews.length > 0
                ? liveAgg.guests.pageViews
                : snapshotAgg.guests.pageViews,
          },
          engagement: {
            ...snapshotAgg.engagement,
            peakHours:
              liveAgg.engagement.peakHours.some((h) => h.count > 0)
                ? liveAgg.engagement.peakHours
                : snapshotAgg.engagement.peakHours,
          },
          snapshotCount: snapshots.length,
          hasLiveFallback: includesToday,
        })
      } else {
        setAnalytics(snapshotAgg)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar analytics')
      setAnalytics(EMPTY_ANALYTICS)
    } finally {
      setLoading(false)
    }
  }, [range, guestLinks, requests, curations, listings])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    analytics,
    range,
    period,
    loading,
    error,
    reload,
    guestLinks,
    requests,
    listings,
  }
}
