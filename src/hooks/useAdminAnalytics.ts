import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  type AdminAnalyticsPeriodId,
  computeIncompleteListings,
  computeMagicLinkUsagePercent,
  computePendingOrdersCount,
  computeTopServices,
  computeUrgentOrders,
  computeVolumeByCategory,
  countGuestsActiveInStayWindow,
} from '../services/adminAnalyticsCompute'
import { subscribeGuestAccessLinks } from '../services/guestAccessLinkFirestore'
import { subscribePropertyCurations } from '../services/propertyCurationFirestore'
import { subscribeServiceRequestsForAdmin } from '../services/serviceRequestsFirestore'
import { clearStaysClientCache, fetchListings } from '../services/staysService'
import type { GuestAccessLinkRecord } from '../types/guestAccessLink'
import type { PropertyCurationRecord } from '../types/propertyCuration'
import type { ServiceRequestRecord } from '../types/serviceRequest'
import type { StaysPropertyListing } from '../types/staysApi'

export type { AdminAnalyticsPeriodId } from '../services/adminAnalyticsCompute'

export type UseAdminAnalyticsResult = {
  guestLinks: GuestAccessLinkRecord[]
  requests: ServiceRequestRecord[]
  curations: PropertyCurationRecord[]
  listings: StaysPropertyListing[]
  period: AdminAnalyticsPeriodId
  setPeriod: (p: AdminAnalyticsPeriodId) => void
  refresh: () => void
  refreshing: boolean
  staysLoading: boolean
  activeGuestsLoading: boolean
  activeGuestsInStayWindow: number
  pendingOrdersCount: number
  incompleteUnitsCount: number
  magicLinkUsagePercent: number | null
  topServices: ReturnType<typeof computeTopServices>
  volumeByCategory: ReturnType<typeof computeVolumeByCategory>
  urgentOrders: ReturnType<typeof computeUrgentOrders>
}

export function useAdminAnalytics(): UseAdminAnalyticsResult {
  const [guestLinks, setGuestLinks] = useState<GuestAccessLinkRecord[]>([])
  const [requests, setRequests] = useState<ServiceRequestRecord[]>([])
  const [curations, setCurations] = useState<PropertyCurationRecord[]>([])
  const [listings, setListings] = useState<StaysPropertyListing[]>([])
  const [staysLoading, setStaysLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<AdminAnalyticsPeriodId>('last7')
  const [refreshTick, setRefreshTick] = useState(0)
  const [activeGuestsInStayWindow, setActiveGuestsInStayWindow] = useState(0)
  const [activeGuestsLoading, setActiveGuestsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setGuestLinks([])
      setRequests([])
      setCurations([])
      return
    }
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
      setStaysLoading(true)
      try {
        const list = await fetchListings()
        if (!cancelled) setListings(list)
      } catch {
        if (!cancelled) setListings([])
      } finally {
        if (!cancelled) {
          setStaysLoading(false)
          setRefreshing(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshTick])

  useEffect(() => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    let cancelled = false
    ;(async () => {
      setActiveGuestsLoading(true)
      try {
        const n = await countGuestsActiveInStayWindow(guestLinks, { signal: ac.signal })
        if (!cancelled && !ac.signal.aborted) setActiveGuestsInStayWindow(n)
      } catch {
        if (!cancelled && !ac.signal.aborted) setActiveGuestsInStayWindow(0)
      } finally {
        if (!cancelled && !ac.signal.aborted) setActiveGuestsLoading(false)
      }
    })()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [guestLinks, refreshTick])

  const refresh = useCallback(() => {
    clearStaysClientCache()
    setRefreshing(true)
    setRefreshTick((x) => x + 1)
  }, [])

  const pendingOrdersCount = useMemo(() => computePendingOrdersCount(requests), [requests])
  const topServices = useMemo(() => computeTopServices(requests, 3), [requests])
  const volumeByCategory = useMemo(
    () => computeVolumeByCategory(requests, period),
    [requests, period],
  )
  const urgentOrders = useMemo(() => computeUrgentOrders(requests, 5), [requests])
  const incompleteUnitsCount = useMemo(
    () => computeIncompleteListings(listings, curations).count,
    [listings, curations],
  )
  const magicLinkUsagePercent = useMemo(
    () => computeMagicLinkUsagePercent(guestLinks),
    [guestLinks],
  )

  return {
    guestLinks,
    requests,
    curations,
    listings,
    period,
    setPeriod,
    refresh,
    refreshing,
    staysLoading,
    activeGuestsLoading,
    activeGuestsInStayWindow,
    pendingOrdersCount,
    incompleteUnitsCount,
    magicLinkUsagePercent,
    topServices,
    volumeByCategory,
    urgentOrders,
  }
}
