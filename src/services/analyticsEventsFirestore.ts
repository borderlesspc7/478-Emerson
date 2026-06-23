import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import type { AnalyticsEventRecord, AnalyticsEventType } from '../types/analytics'

const COLLECTION = 'analyticsEvents'

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return null
}

function mapEvent(id: string, data: DocumentData): AnalyticsEventRecord {
  return {
    id,
    userId: String(data.userId ?? ''),
    type: data.type as AnalyticsEventType,
    path: typeof data.path === 'string' ? data.path : null,
    locale: typeof data.locale === 'string' ? data.locale : null,
    durationMinutes:
      typeof data.durationMinutes === 'number' ? data.durationMinutes : null,
    propertyId: typeof data.propertyId === 'string' ? data.propertyId : null,
    reservationCode:
      typeof data.reservationCode === 'string' ? data.reservationCode : null,
    createdAt: toDate(data.createdAt),
  }
}

export type TrackAnalyticsEventInput = {
  userId: string
  type: AnalyticsEventType
  path?: string
  locale?: string
  durationMinutes?: number
  propertyId?: string
  reservationCode?: string
}

export async function trackAnalyticsEvent(input: TrackAnalyticsEventInput): Promise<void> {
  const db = getFirebaseFirestore()
  if (!db || !isFirebaseConfigured() || !input.userId) return

  const payload: Record<string, unknown> = {
    userId: input.userId,
    type: input.type,
    createdAt: serverTimestamp(),
  }
  if (input.path) payload.path = input.path.slice(0, 120)
  if (input.locale) payload.locale = input.locale.slice(0, 12)
  if (typeof input.durationMinutes === 'number' && input.durationMinutes >= 0) {
    payload.durationMinutes = Math.min(Math.round(input.durationMinutes), 24 * 60)
  }
  if (input.propertyId) payload.propertyId = input.propertyId.slice(0, 64)
  if (input.reservationCode) payload.reservationCode = input.reservationCode.slice(0, 40)

  try {
    await addDoc(collection(db, COLLECTION), payload)
  } catch {
    /* não bloquear UX por falha de analytics */
  }
}

export async function trackGuestLoginMethod(
  userId: string,
  method: 'magic' | 'manual',
  reservationCode?: string,
): Promise<void> {
  await trackAnalyticsEvent({
    userId,
    type: method === 'magic' ? 'login_magic' : 'login_manual',
    reservationCode,
  })
}

export async function trackPwaInstallEvent(userId: string): Promise<void> {
  await trackAnalyticsEvent({ userId, type: 'pwa_install' })
}

export async function trackLocalePreference(userId: string, locale: string): Promise<void> {
  await trackAnalyticsEvent({ userId, type: 'locale_set', locale })
}

export async function fetchAnalyticsEventsInRange(
  from: Date,
  to: Date,
  maxDocs = 5000,
): Promise<AnalyticsEventRecord[]> {
  const db = getFirebaseFirestore()
  if (!db || !isFirebaseConfigured()) return []

  const q = query(
    collection(db, COLLECTION),
    where('createdAt', '>=', Timestamp.fromDate(from)),
    where('createdAt', '<=', Timestamp.fromDate(to)),
    orderBy('createdAt', 'asc'),
    limit(maxDocs),
  )

  const snap = await getDocs(q)
  return snap.docs.map((d) => mapEvent(d.id, d.data()))
}
