import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import { formatAnalyticsDateKey } from '../lib/analyticsPeriod'
import type { AnalyticsSnapshot } from '../types/analytics'

const COLLECTION = 'analyticsSnapshots'

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return null
}

function mapRevenueRow(raw: unknown): AnalyticsSnapshot['revenue']['byProperty'][number] | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const propertyId = String(o.propertyId ?? '').trim()
  if (!propertyId) return null
  return {
    propertyId,
    propertyName: String(o.propertyName ?? propertyId),
    revenueCents: Number(o.revenueCents) || 0,
  }
}

function mapServiceRow(raw: unknown): AnalyticsSnapshot['revenue']['byService'][number] | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const serviceId = String(o.serviceId ?? '').trim()
  if (!serviceId) return null
  return {
    serviceId,
    serviceName: String(o.serviceName ?? serviceId),
    revenueCents: Number(o.revenueCents) || 0,
  }
}

function mapSatisfactionRow(
  raw: unknown,
): AnalyticsSnapshot['properties']['bySatisfaction'][number] | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const propertyId = String(o.propertyId ?? '').trim()
  if (!propertyId) return null
  return {
    propertyId,
    propertyName: String(o.propertyName ?? propertyId),
    avgScore: Number(o.avgScore) || 0,
    reviewCount: Number(o.reviewCount) || 0,
  }
}

function mapSnapshot(dateKey: string, data: DocumentData): AnalyticsSnapshot {
  const revenue = (data.revenue ?? {}) as Record<string, unknown>
  const guests = (data.guests ?? {}) as Record<string, unknown>
  const properties = (data.properties ?? {}) as Record<string, unknown>
  const engagement = (data.engagement ?? {}) as Record<string, unknown>

  const byProperty = Array.isArray(revenue.byProperty)
    ? revenue.byProperty.map(mapRevenueRow).filter(Boolean)
    : []
  const byService = Array.isArray(revenue.byService)
    ? revenue.byService.map(mapServiceRow).filter(Boolean)
    : []

  const hourly = Array.isArray(engagement.hourlyActivity)
    ? engagement.hourlyActivity.map((h) => Number(h) || 0)
    : Array.from({ length: 24 }, () => 0)

  return {
    date: dateKey,
    generatedAt: toDate(data.generatedAt),
    revenue: {
      totalCents: Number(revenue.totalCents) || 0,
      orderCount: Number(revenue.orderCount) || 0,
      reservationsWithPurchaseCount: Number(revenue.reservationsWithPurchaseCount) || 0,
      byProperty: byProperty as AnalyticsSnapshot['revenue']['byProperty'],
      byService: byService as AnalyticsSnapshot['revenue']['byService'],
    },
    guests: {
      accessCount: Number(guests.accessCount) || 0,
      purchaseCount: Number(guests.purchaseCount) || 0,
      sessionCount: Number(guests.sessionCount) || 0,
      totalSessionMinutes: Number(guests.totalSessionMinutes) || 0,
      pageViews:
        guests.pageViews && typeof guests.pageViews === 'object'
          ? (guests.pageViews as Record<string, number>)
          : {},
      returningGuestCount: Number(guests.returningGuestCount) || 0,
      uniqueGuestCount: Number(guests.uniqueGuestCount) || 0,
      npsSum: Number(guests.npsSum) || 0,
      npsCount: Number(guests.npsCount) || 0,
    },
    properties: {
      occupancyRate:
        properties.occupancyRate === null || properties.occupancyRate === undefined
          ? null
          : Number(properties.occupancyRate),
      occupancyBooked: Number(properties.occupancyBooked) || 0,
      occupancyTotal: Number(properties.occupancyTotal) || 0,
      reviewTags:
        properties.reviewTags && typeof properties.reviewTags === 'object'
          ? (properties.reviewTags as Record<string, number>)
          : {},
      curationComplete: Number(properties.curationComplete) || 0,
      curationTotal: Number(properties.curationTotal) || 0,
      bySatisfaction: Array.isArray(properties.bySatisfaction)
        ? (properties.bySatisfaction.map(mapSatisfactionRow).filter(Boolean) as AnalyticsSnapshot['properties']['bySatisfaction'])
        : [],
      byRevenue: Array.isArray(properties.byRevenue)
        ? (properties.byRevenue.map(mapRevenueRow).filter(Boolean) as AnalyticsSnapshot['properties']['byRevenue'])
        : [],
    },
    engagement: {
      pwaInstalls: Number(engagement.pwaInstalls) || 0,
      pwaSessions: Number(engagement.pwaSessions) || 0,
      pushOptIns: Number(engagement.pushOptIns) || 0,
      pushEligible: Number(engagement.pushEligible) || 0,
      magicLinkLogins: Number(engagement.magicLinkLogins) || 0,
      manualLogins: Number(engagement.manualLogins) || 0,
      localeCounts:
        engagement.localeCounts && typeof engagement.localeCounts === 'object'
          ? (engagement.localeCounts as Record<string, number>)
          : {},
      hourlyActivity: hourly.length === 24 ? hourly : Array.from({ length: 24 }, (_, i) => hourly[i] ?? 0),
    },
  }
}

export async function fetchAnalyticsSnapshot(dateKey: string): Promise<AnalyticsSnapshot | null> {
  const db = getFirebaseFirestore()
  if (!db || !isFirebaseConfigured()) return null
  const snap = await getDoc(doc(db, COLLECTION, dateKey))
  if (!snap.exists()) return null
  return mapSnapshot(dateKey, snap.data())
}

export async function fetchAnalyticsSnapshotsInRange(
  from: Date,
  to: Date,
): Promise<AnalyticsSnapshot[]> {
  const db = getFirebaseFirestore()
  if (!db || !isFirebaseConfigured()) return []

  const fromKey = formatAnalyticsDateKey(from)
  const toKey = formatAnalyticsDateKey(to)

  const q = query(
    collection(db, COLLECTION),
    where('date', '>=', fromKey),
    where('date', '<=', toKey),
  )

  const snap = await getDocs(q)
  return snap.docs
    .map((d) => mapSnapshot(d.id, d.data()))
    .sort((a, b) => a.date.localeCompare(b.date))
}
