import type { FieldValue } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'
import type { Firestore } from 'firebase-admin/firestore'

export type DailySnapshotDoc = {
  date: string
  generatedAt: FieldValue
  revenue: {
    totalCents: number
    orderCount: number
    reservationsWithPurchaseCount: number
    byProperty: { propertyId: string; propertyName: string; revenueCents: number }[]
    byService: { serviceId: string; serviceName: string; revenueCents: number }[]
  }
  guests: {
    accessCount: number
    purchaseCount: number
    sessionCount: number
    totalSessionMinutes: number
    pageViews: Record<string, number>
    returningGuestCount: number
    uniqueGuestCount: number
    npsSum: number
    npsCount: number
  }
  properties: {
    occupancyRate: number | null
    occupancyBooked: number
    occupancyTotal: number
    reviewTags: Record<string, number>
    curationComplete: number
    curationTotal: number
    bySatisfaction: {
      propertyId: string
      propertyName: string
      avgScore: number
      reviewCount: number
    }[]
    byRevenue: { propertyId: string; propertyName: string; revenueCents: number }[]
  }
  engagement: {
    pwaInstalls: number
    pwaSessions: number
    pushOptIns: number
    pushEligible: number
    magicLinkLogins: number
    manualLogins: number
    localeCounts: Record<string, number>
    hourlyActivity: number[]
  }
}

function dayBounds(dateKey: string): { start: Date; end: Date } {
  const start = new Date(`${dateKey}T00:00:00`)
  const end = new Date(`${dateKey}T23:59:59.999`)
  return { start, end }
}

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return null
}

function inDay(date: Date | null, start: Date, end: Date): boolean {
  if (!date) return false
  const t = date.getTime()
  return t >= start.getTime() && t <= end.getTime()
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function fetchStaysListingsCount(): Promise<number> {
  const base = process.env.STAYS_BASE_URL?.replace(/\/+$/, '')
  const login = process.env.STAYS_LOGIN
  const password = process.env.STAYS_PASSWORD
  if (!base || !login || !password) return 0

  const auth = `Basic ${Buffer.from(`${login}:${password}`, 'utf8').toString('base64')}`
  const url = `${base}/listing/listings?page=1&pageSize=1`
  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: 'application/json' },
  })
  if (!res.ok) return 0
  const body = (await res.json()) as Record<string, unknown>
  const total =
    Number(body.total) ||
    Number(body.totalCount) ||
    (Array.isArray(body.items) ? body.items.length : 0)
  return Number.isFinite(total) ? total : 0
}

function isCurationComplete(data: Record<string, unknown>): boolean {
  const garage =
    (Array.isArray(data.garagePhotoUrls) && data.garagePhotoUrls.length > 0) ||
    Boolean(String(data.garageVideoUrl ?? '').trim())
  const elevator =
    Array.isArray(data.elevatorPhotoUrls) && data.elevatorPhotoUrls.length > 0
  const notes =
    Boolean(String(data.manualAccessTips ?? '').trim()) ||
    Boolean(String(data.manualPropertyTips ?? '').trim())
  return garage && elevator && notes
}

export async function buildDailyAnalyticsSnapshot(
  db: Firestore,
  dateKey: string,
): Promise<DailySnapshotDoc> {
  const { start, end } = dayBounds(dateKey)

  const [
    eventsSnap,
    reviewsSnap,
    requestsSnap,
    linksSnap,
    curationsSnap,
    usersSnap,
  ] = await Promise.all([
    db
      .collection('analyticsEvents')
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<=', Timestamp.fromDate(end))
      .get(),
    db
      .collection('guestReviews')
      .where('createdAt', '>=', Timestamp.fromDate(start))
      .where('createdAt', '<=', Timestamp.fromDate(end))
      .get(),
    db.collection('serviceRequests').get(),
    db.collection('guestAccessLinks').get(),
    db.collection('propertyCurations').get(),
    db.collection('users').where('role', '==', 'guest').get(),
  ])

  const pageViews: Record<string, number> = {}
  const localeCounts: Record<string, number> = {}
  const hourlyActivity = Array.from({ length: 24 }, () => 0)
  let sessionCount = 0
  let totalSessionMinutes = 0
  let magicLinkLogins = 0
  let manualLogins = 0
  let pwaInstalls = 0
  let pwaSessions = 0

  for (const doc of eventsSnap.docs) {
    const data = doc.data()
    const type = String(data.type ?? '')
    const createdAt = toDate(data.createdAt)
    if (type === 'page_view' && typeof data.path === 'string') {
      pageViews[data.path] = (pageViews[data.path] ?? 0) + 1
      if (createdAt) hourlyActivity[createdAt.getHours()]++
    }
    if (type === 'session_end') {
      sessionCount++
      pwaSessions++
      totalSessionMinutes += Number(data.durationMinutes) || 0
    }
    if (type === 'login_magic') magicLinkLogins++
    if (type === 'login_manual') manualLogins++
    if (type === 'pwa_install') pwaInstalls++
    if (type === 'locale_set' && typeof data.locale === 'string') {
      localeCounts[data.locale] = (localeCounts[data.locale] ?? 0) + 1
    }
  }

  const propertyRevenue = new Map<
    string,
    { propertyId: string; propertyName: string; revenueCents: number }
  >()
  const serviceRevenue = new Map<
    string,
    { serviceId: string; serviceName: string; revenueCents: number }
  >()
  const reservationsWithPurchase = new Set<string>()
  let totalCents = 0
  let orderCount = 0

  for (const doc of requestsSnap.docs) {
    const data = doc.data()
    if (data.paymentStatus !== 'paid') continue
    const paidAt = toDate(data.paidAt) ?? toDate(data.createdAt)
    if (!inDay(paidAt, start, end)) continue

    const cents = Number(data.priceInCents) || 0
    totalCents += cents
    orderCount++
    const reservationCode = String(data.reservationCode ?? '').trim()
    if (reservationCode) reservationsWithPurchase.add(reservationCode)

    const propertyKey = String(data.propertyName ?? 'unknown')
    const prop = propertyRevenue.get(propertyKey) ?? {
      propertyId: propertyKey,
      propertyName: String(data.propertyName ?? '—'),
      revenueCents: 0,
    }
    prop.revenueCents += cents
    propertyRevenue.set(propertyKey, prop)

    const serviceId = String(data.serviceId ?? doc.id)
    const svc = serviceRevenue.get(serviceId) ?? {
      serviceId,
      serviceName: String(data.serviceName ?? serviceId),
      revenueCents: 0,
    }
    svc.revenueCents += cents
    serviceRevenue.set(serviceId, svc)
  }

  let accessCount = 0
  for (const doc of linksSnap.docs) {
    const data = doc.data()
    if (data.accessActive !== true) continue
    const lastAccessAt = toDate(data.lastAccessAt)
    if (inDay(lastAccessAt, start, end)) accessCount++
  }

  const reviewTags: Record<string, number> = {}
  const satisfactionAcc = new Map<
    string,
    { propertyId: string; propertyName: string; sum: number; count: number }
  >()
  let npsSum = 0
  let npsCount = 0

  for (const doc of reviewsSnap.docs) {
    const data = doc.data()
    const score = Number(data.score) || 0
    npsSum += score
    npsCount++
    const propertyId = String(data.propertyId ?? '')
    const propertyName = String(data.propertyName ?? propertyId)
    if (propertyId) {
      const prev = satisfactionAcc.get(propertyId)
      if (prev) {
        prev.sum += score
        prev.count++
      } else {
        satisfactionAcc.set(propertyId, { propertyId, propertyName, sum: score, count: 1 })
      }
    }
    const tags = Array.isArray(data.tags) ? data.tags : []
    for (const tag of tags) {
      if (typeof tag !== 'string') continue
      const key = tag.trim().toLowerCase()
      if (key) reviewTags[key] = (reviewTags[key] ?? 0) + 1
    }
  }

  const curationTotal = curationsSnap.size
  let curationComplete = 0
  for (const doc of curationsSnap.docs) {
    if (isCurationComplete(doc.data())) curationComplete++
  }

  const listingsTotal = await fetchStaysListingsCount()
  const activeLinks = linksSnap.docs.filter((d) => d.data().accessActive === true).length
  const occupancyTotal = listingsTotal || linksSnap.size
  const occupancyBooked = activeLinks
  const occupancyRate =
    occupancyTotal > 0 ? (occupancyBooked / occupancyTotal) * 100 : null

  let pushOptIns = 0
  const guestUids = new Set<string>()
  for (const doc of usersSnap.docs) {
    guestUids.add(doc.id)
    if (doc.data().pushNotificationsEnabled === true) pushOptIns++
  }

  const returningGuestCount = linksSnap.docs.filter(
    (d) => (Number(d.data().accessCount) || 0) > 1,
  ).length

  return {
    date: dateKey,
    generatedAt: Timestamp.now(),
    revenue: {
      totalCents,
      orderCount,
      reservationsWithPurchaseCount: reservationsWithPurchase.size,
      byProperty: Array.from(propertyRevenue.values()),
      byService: Array.from(serviceRevenue.values()),
    },
    guests: {
      accessCount,
      purchaseCount: orderCount,
      sessionCount,
      totalSessionMinutes,
      pageViews,
      returningGuestCount,
      uniqueGuestCount: guestUids.size,
      npsSum,
      npsCount,
    },
    properties: {
      occupancyRate,
      occupancyBooked,
      occupancyTotal,
      reviewTags,
      curationComplete,
      curationTotal,
      bySatisfaction: Array.from(satisfactionAcc.values()).map((row) => ({
        propertyId: row.propertyId,
        propertyName: row.propertyName,
        avgScore: row.count > 0 ? row.sum / row.count : 0,
        reviewCount: row.count,
      })),
      byRevenue: Array.from(propertyRevenue.values()),
    },
    engagement: {
      pwaInstalls,
      pwaSessions,
      pushOptIns,
      pushEligible: usersSnap.size,
      magicLinkLogins,
      manualLogins,
      localeCounts,
      hourlyActivity,
    },
  }
}

export function yesterdayDateKey(now = new Date()): string {
  const d = new Date(now)
  d.setDate(d.getDate() - 1)
  return formatDateKey(d)
}
