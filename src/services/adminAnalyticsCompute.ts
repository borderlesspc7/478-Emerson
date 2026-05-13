import { isStayAccessActive } from '../lib/auth'
import type { GuestAccessLinkRecord } from '../types/guestAccessLink'
import type { PropertyCurationRecord } from '../types/propertyCuration'
import type { ServiceRequestRecord } from '../types/serviceRequest'
import type { StaysBooking, StaysPropertyListing } from '../types/staysApi'
import { fetchReservation } from './staysService'
import { mapStaysToGuestStayBundle, mergeGuestStayWithZenCuration, toStayCheckOutIso, toStayIso } from './staysMapper'

export type AdminAnalyticsPeriodId = 'today' | 'last7' | 'thisMonth'

export type ServiceOrderCategoryKey = 'cleaning' | 'linen' | 'maintenance' | 'other'

const PLACEHOLDER_BOOKING: StaysBooking = {
  id: '_analytics',
  type: 'booked',
  checkInDate: '2099-01-01',
  checkInTime: '14:00',
  checkOutDate: '2099-01-03',
  checkOutTime: '11:00',
}

function isWifiIncomplete(wifi: { ssid: string; password: string }): boolean {
  const bad = (s: string) => {
    const t = s.trim()
    return !t || t === '—' || /^[—\-–]+$/.test(t) || /^n\/?a$/i.test(t)
  }
  return bad(wifi.ssid) || bad(wifi.password)
}

function listingPropertyKey(l: StaysPropertyListing): string {
  return String(l._id || l.id || '').trim()
}

export function classifyServiceOrderCategory(serviceName: string | null): ServiceOrderCategoryKey {
  const n = (serviceName ?? '').toLowerCase()
  if (/limpeza|cleaning|faxina|housekeeping/i.test(n)) return 'cleaning'
  if (/enxoval|roupa de cama|lavanderia|linen|laundry|toalhas/i.test(n)) return 'linen'
  if (/manutenção|maintenance|reparo|conserto|técnico|encanador|eletricista/i.test(n))
    return 'maintenance'
  return 'other'
}

export function getPeriodRange(period: AdminAnalyticsPeriodId, now = new Date()): { from: Date; to: Date } {
  const to = new Date(now)
  const from = new Date(now)
  if (period === 'today') {
    from.setHours(0, 0, 0, 0)
  } else if (period === 'last7') {
    from.setDate(from.getDate() - 7)
    from.setHours(0, 0, 0, 0)
  } else {
    from.setDate(1)
    from.setHours(0, 0, 0, 0)
  }
  return { from, to }
}

export function isRequestPendingLike(r: ServiceRequestRecord): boolean {
  return r.status === 'pending' || r.status === 'in_progress'
}

export function computeVolumeByCategory(
  requests: ServiceRequestRecord[],
  period: AdminAnalyticsPeriodId,
  now = new Date(),
): { category: ServiceOrderCategoryKey; count: number }[] {
  const { from, to } = getPeriodRange(period, now)
  const counts: Record<ServiceOrderCategoryKey, number> = {
    cleaning: 0,
    linen: 0,
    maintenance: 0,
    other: 0,
  }
  for (const r of requests) {
    const c = r.createdAt
    if (!c || c < from || c > to) continue
    const cat = classifyServiceOrderCategory(r.serviceName)
    counts[cat]++
  }
  return (Object.keys(counts) as ServiceOrderCategoryKey[]).map((category) => ({
    category,
    count: counts[category],
  }))
}

export type TopServiceRow = { serviceName: string; count: number }

export function computeTopServices(requests: ServiceRequestRecord[], limit = 3): TopServiceRow[] {
  const map = new Map<string, number>()
  for (const r of requests) {
    const key = (r.serviceName ?? r.serviceId ?? '—').trim() || '—'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([serviceName, count]) => ({ serviceName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export type UrgentOrderRow = {
  id: string
  serviceName: string | null
  propertyName: string | null
  reservationCode: string | null
  createdAt: Date | null
}

export function computeUrgentOrders(requests: ServiceRequestRecord[], limit = 5): UrgentOrderRow[] {
  return requests
    .filter(isRequestPendingLike)
    .filter((r) => r.createdAt)
    .sort((a, b) => (a.createdAt!.getTime() || 0) - (b.createdAt!.getTime() || 0))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      serviceName: r.serviceName,
      propertyName: r.propertyName,
      reservationCode: r.reservationCode,
      createdAt: r.createdAt,
    }))
}

export function computeIncompleteListings(
  listings: StaysPropertyListing[],
  curations: PropertyCurationRecord[],
): { count: number; sampleIds: string[] } {
  const byCuration = new Map(curations.map((c) => [c.propertyId, c]))
  const incompleteIds: string[] = []
  for (const listing of listings) {
    const id = listingPropertyKey(listing)
    if (!id) continue
    const curation = byCuration.get(id) ?? null
    const hasGaragePhotos = (curation?.garagePhotoUrls?.length ?? 0) > 0
    const bundle = mapStaysToGuestStayBundle(id, PLACEHOLDER_BOOKING, listing, null, null)
    const merged = mergeGuestStayWithZenCuration(bundle.guestStay, curation, {
      accessActive: curation != null,
    })
    const wifiBad = isWifiIncomplete(merged.wifi)
    const garageBad = !hasGaragePhotos
    if (garageBad || wifiBad) incompleteIds.push(id)
  }
  return { count: incompleteIds.length, sampleIds: incompleteIds.slice(0, 8) }
}

export function bookingToStayWindow(booking: StaysBooking): { checkInAt: string; checkOutAt: string } {
  return {
    checkInAt: toStayIso(booking.checkInDate, booking.checkInTime, false),
    checkOutAt: toStayCheckOutIso(booking.checkOutDate, booking.checkOutTime),
  }
}

export async function countGuestsActiveInStayWindow(
  links: GuestAccessLinkRecord[],
  options: { signal?: AbortSignal; concurrency?: number } = {},
): Promise<number> {
  const actives = links.filter((l) => l.accessActive)
  const { signal, concurrency = 4 } = options
  if (actives.length === 0) return 0

  let nextIndex = 0
  const results: number[] = []

  async function worker() {
    while (!signal?.aborted) {
      const i = nextIndex++
      if (i >= actives.length) break
      const link = actives[i]
      try {
        const booking = await fetchReservation(link.reservationCode)
        if (signal?.aborted) return
        if (booking.type === 'canceled') {
          results[i] = 0
          continue
        }
        const window = bookingToStayWindow(booking)
        results[i] = isStayAccessActive(window) ? 1 : 0
      } catch {
        results[i] = 0
      }
    }
  }

  const n = Math.min(concurrency, actives.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  if (signal?.aborted) return 0
  return results.reduce((a, b) => a + (b ?? 0), 0)
}

export function computeMagicLinkUsagePercent(links: GuestAccessLinkRecord[]): number | null {
  const active = links.filter((l) => l.accessActive)
  if (active.length === 0) return null
  const used = active.filter((l) => (l.accessCount ?? 0) > 0).length
  return Math.round((used / active.length) * 100)
}

export function computePendingOrdersCount(requests: ServiceRequestRecord[]): number {
  return requests.filter(isRequestPendingLike).length
}
