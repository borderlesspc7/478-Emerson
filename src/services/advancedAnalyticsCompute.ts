import { differenceInCalendarDays, endOfMonth, startOfMonth } from 'date-fns'
import { computeIncompleteListings } from './adminAnalyticsCompute'
import { formatAnalyticsDateKey, isDateInRange } from '../lib/analyticsPeriod'
import type {
  AggregatedAnalytics,
  AnalyticsEventRecord,
  AnalyticsSnapshot,
  GuestReviewRecord,
  PropertyRevenueRow,
  ServiceRevenueRow,
} from '../types/analytics'
import type { GuestAccessLinkRecord } from '../types/guestAccessLink'
import type { PropertyCurationRecord } from '../types/propertyCuration'
import type { ServiceRequestRecord } from '../types/serviceRequest'
import type { StaysPropertyListing } from '../types/staysApi'

function mergePropertyRevenue(
  target: Map<string, PropertyRevenueRow>,
  rows: PropertyRevenueRow[],
): void {
  for (const row of rows) {
    const prev = target.get(row.propertyId)
    if (prev) {
      prev.revenueCents += row.revenueCents
    } else {
      target.set(row.propertyId, { ...row })
    }
  }
}

function mergeServiceRevenue(
  target: Map<string, ServiceRevenueRow>,
  rows: ServiceRevenueRow[],
): void {
  for (const row of rows) {
    const prev = target.get(row.serviceId)
    if (prev) {
      prev.revenueCents += row.revenueCents
    } else {
      target.set(row.serviceId, { ...row })
    }
  }
}

function mergeRecordCounts(target: Record<string, number>, source: Record<string, number>): void {
  for (const [key, count] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + count
  }
}

function topServiceByRevenue(map: Map<string, ServiceRevenueRow>): ServiceRevenueRow | null {
  let best: ServiceRevenueRow | null = null
  for (const row of map.values()) {
    if (!best || row.revenueCents > best.revenueCents) best = row
  }
  return best
}

function computeMonthlyProjection(
  dailyTrend: { date: string; revenueCents: number }[],
  now: Date,
): number {
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1
  const monthRevenue = dailyTrend
    .filter((d) => {
      const day = new Date(`${d.date}T12:00:00`)
      return day >= monthStart && day <= monthEnd
    })
    .reduce((sum, d) => sum + d.revenueCents, 0)

  const elapsedDays = Math.max(1, differenceInCalendarDays(now, monthStart) + 1)
  const dailyAvg = monthRevenue / elapsedDays
  const seasonalityFactor = 1.05
  return Math.round(dailyAvg * daysInMonth * seasonalityFactor)
}

export function aggregateAnalyticsSnapshots(snapshots: AnalyticsSnapshot[]): AggregatedAnalytics {
  const propertyRevenue = new Map<string, PropertyRevenueRow>()
  const serviceRevenue = new Map<string, ServiceRevenueRow>()
  const pageViews: Record<string, number> = {}
  const reviewTags: Record<string, number> = {}
  const localeCounts: Record<string, number> = {}
  const hourly = Array.from({ length: 24 }, () => 0)
  const dailyTrend: { date: string; revenueCents: number }[] = []
  const npsTrend: AggregatedAnalytics['guests']['npsTrend'] = []

  let totalCents = 0
  let reservationsWithPurchase = 0
  let accessCount = 0
  let purchaseCount = 0
  let sessionCount = 0
  let totalSessionMinutes = 0
  let returningGuests = 0
  let uniqueGuests = 0
  let npsSum = 0
  let npsCount = 0
  let occupancyBooked = 0
  let occupancyTotal = 0
  let curationComplete = 0
  let curationTotal = 0
  let pwaInstalls = 0
  let pwaSessions = 0
  let pushOptIns = 0
  let pushEligible = 0
  let magicLogins = 0
  let manualLogins = 0

  const satisfactionAcc = new Map<
    string,
    { propertyId: string; propertyName: string; sum: number; count: number }
  >()

  for (const snap of snapshots) {
    totalCents += snap.revenue.totalCents
    reservationsWithPurchase += snap.revenue.reservationsWithPurchaseCount
    mergePropertyRevenue(propertyRevenue, snap.revenue.byProperty)
    mergeServiceRevenue(serviceRevenue, snap.revenue.byService)
    dailyTrend.push({ date: snap.date, revenueCents: snap.revenue.totalCents })

    accessCount += snap.guests.accessCount
    purchaseCount += snap.guests.purchaseCount
    sessionCount += snap.guests.sessionCount
    totalSessionMinutes += snap.guests.totalSessionMinutes
    returningGuests += snap.guests.returningGuestCount
    uniqueGuests += snap.guests.uniqueGuestCount
    npsSum += snap.guests.npsSum
    npsCount += snap.guests.npsCount
    mergeRecordCounts(pageViews, snap.guests.pageViews)

    npsTrend.push({
      date: snap.date,
      avgScore: snap.guests.npsCount > 0 ? snap.guests.npsSum / snap.guests.npsCount : null,
      reviewCount: snap.guests.npsCount,
    })

    occupancyBooked += snap.properties.occupancyBooked
    occupancyTotal += snap.properties.occupancyTotal
    mergeRecordCounts(reviewTags, snap.properties.reviewTags)
    curationComplete += snap.properties.curationComplete
    curationTotal += snap.properties.curationTotal

    for (const row of snap.properties.bySatisfaction) {
      const prev = satisfactionAcc.get(row.propertyId)
      if (prev) {
        prev.sum += row.avgScore * row.reviewCount
        prev.count += row.reviewCount
      } else {
        satisfactionAcc.set(row.propertyId, {
          propertyId: row.propertyId,
          propertyName: row.propertyName,
          sum: row.avgScore * row.reviewCount,
          count: row.reviewCount,
        })
      }
    }

    pwaInstalls += snap.engagement.pwaInstalls
    pwaSessions += snap.engagement.pwaSessions
    pushOptIns += snap.engagement.pushOptIns
    pushEligible += snap.engagement.pushEligible
    magicLogins += snap.engagement.magicLinkLogins
    manualLogins += snap.engagement.manualLogins
    mergeRecordCounts(localeCounts, snap.engagement.localeCounts)

    snap.engagement.hourlyActivity.forEach((count, hour) => {
      hourly[hour] = (hourly[hour] ?? 0) + count
    })
  }

  const pageViewTotal = Object.values(pageViews).reduce((a, b) => a + b, 0)
  const pageViewRows = Object.entries(pageViews)
    .map(([path, count]) => ({
      path,
      count,
      share: pageViewTotal > 0 ? (count / pageViewTotal) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const localeTotal = Object.values(localeCounts).reduce((a, b) => a + b, 0)
  const localeDistribution = Object.entries(localeCounts)
    .map(([locale, count]) => ({
      locale,
      count,
      share: localeTotal > 0 ? (count / localeTotal) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  const loginTotal = magicLogins + manualLogins

  const byPropertyRevenue = Array.from(propertyRevenue.values()).sort(
    (a, b) => b.revenueCents - a.revenueCents,
  )

  const bySatisfaction = Array.from(satisfactionAcc.values())
    .map((row) => ({
      propertyId: row.propertyId,
      propertyName: row.propertyName,
      avgScore: row.count > 0 ? row.sum / row.count : 0,
      reviewCount: row.count,
    }))
    .filter((r) => r.reviewCount > 0)
    .sort((a, b) => b.avgScore - a.avgScore)

  const recurringIssueTags = Object.entries(reviewTags)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  const movingWindow = npsTrend.slice(-7)
  const movingNpsSum = movingWindow.reduce((s, p) => s + (p.avgScore ?? 0) * p.reviewCount, 0)
  const movingNpsCount = movingWindow.reduce((s, p) => s + p.reviewCount, 0)

  return {
    revenue: {
      totalCents,
      avgTicketCents:
        reservationsWithPurchase > 0 ? Math.round(totalCents / reservationsWithPurchase) : 0,
      reservationsWithPurchaseCount: reservationsWithPurchase,
      byProperty: byPropertyRevenue,
      topServiceByRevenue: topServiceByRevenue(serviceRevenue),
      monthlyProjectionCents: computeMonthlyProjection(dailyTrend, new Date()),
      dailyTrend,
    },
    guests: {
      conversionRate: accessCount > 0 ? (purchaseCount / accessCount) * 100 : null,
      avgSessionMinutes: sessionCount > 0 ? totalSessionMinutes / sessionCount : null,
      pageViews: pageViewRows,
      returnRate: uniqueGuests > 0 ? (returningGuests / uniqueGuests) * 100 : null,
      npsTrend,
      npsMovingAvg: movingNpsCount > 0 ? movingNpsSum / movingNpsCount : null,
      npsReviewCount: npsCount,
    },
    properties: {
      bySatisfaction,
      byRevenue: byPropertyRevenue,
      occupancyRate:
        occupancyTotal > 0 ? (occupancyBooked / occupancyTotal) * 100 : null,
      recurringIssueTags,
      curationCompletePercent:
        curationTotal > 0 ? (curationComplete / curationTotal) * 100 : null,
      curationComplete,
      curationTotal,
    },
    engagement: {
      pwaInstallRate: pwaSessions > 0 ? (pwaInstalls / pwaSessions) * 100 : null,
      pushOptInRate: pushEligible > 0 ? (pushOptIns / pushEligible) * 100 : null,
      magicLinkPercent: loginTotal > 0 ? (magicLogins / loginTotal) * 100 : null,
      manualLoginPercent: loginTotal > 0 ? (manualLogins / loginTotal) * 100 : null,
      localeDistribution,
      peakHours: hourly.map((count, hour) => ({ hour, count })),
    },
    snapshotCount: snapshots.length,
    hasLiveFallback: false,
  }
}

export type LiveAnalyticsInput = {
  from: Date
  to: Date
  requests: ServiceRequestRecord[]
  events: AnalyticsEventRecord[]
  reviews: GuestReviewRecord[]
  guestLinks: GuestAccessLinkRecord[]
  curations: PropertyCurationRecord[]
  listings: StaysPropertyListing[]
  guestUsers: { uid: string; reservationCode: string | null; pushEnabled: boolean }[]
  occupancyRate: number | null
  occupancyBooked: number
  occupancyTotal: number
}

function paidRequestsInRange(requests: ServiceRequestRecord[], from: Date, to: Date) {
  return requests.filter(
    (r) =>
      r.paymentStatus === 'paid' &&
      isDateInRange(r.paidAt ?? r.createdAt, from, to),
  )
}

export function computeLiveAnalytics(input: LiveAnalyticsInput): AggregatedAnalytics {
  const paid = paidRequestsInRange(input.requests, input.from, input.to)
  const propertyRevenue = new Map<string, PropertyRevenueRow>()
  const serviceRevenue = new Map<string, ServiceRevenueRow>()
  const reservations = new Set<string>()
  const pageViews: Record<string, number> = {}
  const localeCounts: Record<string, number> = {}
  const hourly = Array.from({ length: 24 }, () => 0)
  const reviewTags: Record<string, number> = {}
  const dailyRevenue: Record<string, number> = {}

  let sessionCount = 0
  let totalSessionMinutes = 0
  let magicLogins = 0
  let manualLogins = 0
  let pwaInstalls = 0
  let pwaSessions = 0

  for (const r of paid) {
    const key = formatAnalyticsDateKey(r.paidAt ?? r.createdAt ?? input.from)
    dailyRevenue[key] = (dailyRevenue[key] ?? 0) + r.priceInCents
    if (r.reservationCode) reservations.add(r.reservationCode)

    const propKey = r.propertyName ?? 'unknown'
    const prop = propertyRevenue.get(propKey) ?? {
      propertyId: propKey,
      propertyName: r.propertyName ?? '—',
      revenueCents: 0,
    }
    prop.revenueCents += r.priceInCents
    propertyRevenue.set(propKey, prop)

    const svcKey = r.serviceId
    const svc = serviceRevenue.get(svcKey) ?? {
      serviceId: svcKey,
      serviceName: r.serviceName ?? svcKey,
      revenueCents: 0,
    }
    svc.revenueCents += r.priceInCents
    serviceRevenue.set(svcKey, svc)
  }

  for (const ev of input.events) {
    if (!isDateInRange(ev.createdAt, input.from, input.to)) continue
    if (ev.type === 'page_view' && ev.path) {
      pageViews[ev.path] = (pageViews[ev.path] ?? 0) + 1
      const hour = ev.createdAt?.getHours() ?? 0
      hourly[hour] = (hourly[hour] ?? 0) + 1
    }
    if (ev.type === 'session_end' && ev.durationMinutes != null) {
      sessionCount++
      totalSessionMinutes += ev.durationMinutes
      pwaSessions++
    }
    if (ev.type === 'login_magic') magicLogins++
    if (ev.type === 'login_manual') manualLogins++
    if (ev.type === 'pwa_install') pwaInstalls++
    if (ev.type === 'locale_set' && ev.locale) {
      localeCounts[ev.locale] = (localeCounts[ev.locale] ?? 0) + 1
    }
  }

  const accessCount = input.guestLinks.filter(
    (l) => l.accessActive && isDateInRange(l.lastAccessAt ?? null, input.from, input.to),
  ).length

  const purchaseCount = paid.length
  const totalCents = paid.reduce((s, r) => s + r.priceInCents, 0)

  const reservationHistory = new Map<string, number>()
  for (const link of input.guestLinks) {
    if (!link.reservationCode) continue
    reservationHistory.set(link.reservationCode, (reservationHistory.get(link.reservationCode) ?? 0) + 1)
  }
  const returningGuests = input.guestUsers.filter((u) => {
    const code = u.reservationCode
    return code ? (reservationHistory.get(code) ?? 0) > 1 : false
  }).length

  const periodReviews = input.reviews.filter((r) =>
    isDateInRange(r.createdAt, input.from, input.to),
  )
  let npsSum = 0
  const satisfactionAcc = new Map<
    string,
    { propertyId: string; propertyName: string; sum: number; count: number }
  >()

  for (const review of periodReviews) {
    npsSum += review.score
    for (const tag of review.tags) {
      const normalized = tag.trim().toLowerCase()
      if (normalized) reviewTags[normalized] = (reviewTags[normalized] ?? 0) + 1
    }
    const prev = satisfactionAcc.get(review.propertyId)
    if (prev) {
      prev.sum += review.score
      prev.count++
    } else {
      satisfactionAcc.set(review.propertyId, {
        propertyId: review.propertyId,
        propertyName: review.propertyName ?? review.propertyId,
        sum: review.score,
        count: 1,
      })
    }
  }

  const incomplete = computeIncompleteListings(input.listings, input.curations)
  const curationTotal = input.listings.length
  const curationComplete = Math.max(0, curationTotal - incomplete.count)

  const pushOptIns = input.guestUsers.filter((u) => u.pushEnabled).length
  const pushEligible = input.guestUsers.length

  const pageViewTotal = Object.values(pageViews).reduce((a, b) => a + b, 0)
  const localeTotal = Object.values(localeCounts).reduce((a, b) => a + b, 0)
  const loginTotal = magicLogins + manualLogins

  const dailyTrend = Object.entries(dailyRevenue)
    .map(([date, revenueCents]) => ({ date, revenueCents }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const byPropertyRevenue = Array.from(propertyRevenue.values()).sort(
    (a, b) => b.revenueCents - a.revenueCents,
  )

  return {
    revenue: {
      totalCents,
      avgTicketCents:
        reservations.size > 0 ? Math.round(totalCents / reservations.size) : 0,
      reservationsWithPurchaseCount: reservations.size,
      byProperty: byPropertyRevenue,
      topServiceByRevenue: topServiceByRevenue(serviceRevenue),
      monthlyProjectionCents: computeMonthlyProjection(dailyTrend, new Date()),
      dailyTrend,
    },
    guests: {
      conversionRate: accessCount > 0 ? (purchaseCount / accessCount) * 100 : null,
      avgSessionMinutes: sessionCount > 0 ? totalSessionMinutes / sessionCount : null,
      pageViews: Object.entries(pageViews)
        .map(([path, count]) => ({
          path,
          count,
          share: pageViewTotal > 0 ? (count / pageViewTotal) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count),
      returnRate:
        input.guestUsers.length > 0
          ? (returningGuests / input.guestUsers.length) * 100
          : null,
      npsTrend: [
        {
          date: formatAnalyticsDateKey(input.to),
          avgScore: periodReviews.length > 0 ? npsSum / periodReviews.length : null,
          reviewCount: periodReviews.length,
        },
      ],
      npsMovingAvg: periodReviews.length > 0 ? npsSum / periodReviews.length : null,
      npsReviewCount: periodReviews.length,
    },
    properties: {
      bySatisfaction: Array.from(satisfactionAcc.values())
        .map((row) => ({
          propertyId: row.propertyId,
          propertyName: row.propertyName,
          avgScore: row.count > 0 ? row.sum / row.count : 0,
          reviewCount: row.count,
        }))
        .sort((a, b) => b.avgScore - a.avgScore),
      byRevenue: byPropertyRevenue,
      occupancyRate: input.occupancyRate,
      recurringIssueTags: Object.entries(reviewTags)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12),
      curationCompletePercent:
        curationTotal > 0 ? (curationComplete / curationTotal) * 100 : null,
      curationComplete,
      curationTotal,
    },
    engagement: {
      pwaInstallRate: pwaSessions > 0 ? (pwaInstalls / pwaSessions) * 100 : null,
      pushOptInRate: pushEligible > 0 ? (pushOptIns / pushEligible) * 100 : null,
      magicLinkPercent: loginTotal > 0 ? (magicLogins / loginTotal) * 100 : null,
      manualLoginPercent: loginTotal > 0 ? (manualLogins / loginTotal) * 100 : null,
      localeDistribution: Object.entries(localeCounts)
        .map(([locale, count]) => ({
          locale,
          count,
          share: localeTotal > 0 ? (count / localeTotal) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count),
      peakHours: hourly.map((count, hour) => ({ hour, count })),
    },
    snapshotCount: 0,
    hasLiveFallback: true,
  }
}

export function mergeSnapshotAndLive(
  snapshotAgg: AggregatedAnalytics,
  liveAgg: AggregatedAnalytics,
): AggregatedAnalytics {
  if (snapshotAgg.snapshotCount === 0) return liveAgg
  if (!liveAgg.hasLiveFallback) return snapshotAgg
  return {
    ...snapshotAgg,
    revenue: {
      ...snapshotAgg.revenue,
      totalCents: snapshotAgg.revenue.totalCents + liveAgg.revenue.totalCents,
      dailyTrend: [...snapshotAgg.revenue.dailyTrend, ...liveAgg.revenue.dailyTrend],
    },
    snapshotCount: snapshotAgg.snapshotCount,
    hasLiveFallback: true,
  }
}
