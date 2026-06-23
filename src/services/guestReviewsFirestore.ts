import {
  collection,
  getDocs,
  limit,
  query,
  Timestamp,
  where,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import type { GuestReviewRecord } from '../types/analytics'

const COLLECTION = 'guestReviews'

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return null
}

function mapReview(id: string, data: DocumentData): GuestReviewRecord {
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((t): t is string => typeof t === 'string')
    : []
  return {
    id,
    userId: String(data.userId ?? ''),
    reservationCode: String(data.reservationCode ?? ''),
    propertyId: String(data.propertyId ?? ''),
    propertyName: typeof data.propertyName === 'string' ? data.propertyName : null,
    score: Number(data.score) || 0,
    tags,
    comment: typeof data.comment === 'string' ? data.comment : null,
    createdAt: toDate(data.createdAt),
  }
}

export async function fetchGuestReviewsInRange(
  from: Date,
  to: Date,
  maxDocs = 2000,
): Promise<GuestReviewRecord[]> {
  const db = getFirebaseFirestore()
  if (!db || !isFirebaseConfigured()) return []

  const q = query(
    collection(db, COLLECTION),
    where('createdAt', '>=', Timestamp.fromDate(from)),
    where('createdAt', '<=', Timestamp.fromDate(to)),
    limit(maxDocs),
  )

  const snap = await getDocs(q)
  return snap.docs.map((d) => mapReview(d.id, d.data()))
}
