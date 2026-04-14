import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import type { ServiceOfferId } from '../types/guestStay'
import type { ServiceRequestRecord, ServiceRequestStatus } from '../types/serviceRequest'

/**
 * Coleção de topo (uma “tabela” de pedidos).
 * Cada documento tem `userId` — só o dono pode ler/alterar (ver firestore.rules).
 */
export const SERVICE_REQUESTS_COLLECTION = 'serviceRequests'

const OFFER_IDS: ServiceOfferId[] = [
  'cleaning',
  'linen',
  'maintenance',
  'concierge',
]

function isOfferId(v: unknown): v is ServiceOfferId {
  return typeof v === 'string' && OFFER_IDS.includes(v as ServiceOfferId)
}

function toDate(v: unknown): Date | null {
  if (v && typeof v === 'object' && 'toDate' in v) {
    const d = (v as Timestamp).toDate()
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function toNullableString(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : null
}

function mapDoc(
  id: string,
  data: Record<string, unknown>
): ServiceRequestRecord | null {
  const serviceId = data.serviceId
  if (!isOfferId(serviceId)) return null
  const uid = data.userId
  if (typeof uid !== 'string' || !uid) return null
  const status = data.status
  const st: ServiceRequestStatus =
    status === 'completed' ? 'completed' : 'pending'
  const rawPriceInCents = data.priceInCents
  const priceInCents =
    typeof rawPriceInCents === 'number' && Number.isFinite(rawPriceInCents)
      ? Math.max(0, Math.round(rawPriceInCents))
      : 0
  return {
    id,
    userId: uid,
    serviceId,
    priceInCents,
    requesterName: toNullableString(data.requesterName),
    reservationCode: toNullableString(data.reservationCode),
    propertyName: toNullableString(data.propertyName),
    status: st,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    completedAt: toDate(data.completedAt),
  }
}

function serviceRequestsCollectionRef() {
  const db = getFirebaseFirestore()
  if (!db) return null
  return collection(db, SERVICE_REQUESTS_COLLECTION)
}

export async function createServiceRequest(
  uid: string,
  serviceId: ServiceOfferId,
  priceInCents: number,
  metadata: {
    requesterName: string
    reservationCode: string
    propertyName: string
  }
): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error('AUTH_NOT_CONFIGURED')
  const col = serviceRequestsCollectionRef()
  if (!col) throw new Error('AUTH_NOT_CONFIGURED')
  const safePriceInCents = Math.max(0, Math.round(priceInCents))

  await addDoc(col, {
    userId: uid,
    serviceId,
    priceInCents: safePriceInCents,
    requesterName: metadata.requesterName,
    reservationCode: metadata.reservationCode,
    propertyName: metadata.propertyName,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function markServiceRequestCompleted(
  _uid: string,
  requestId: string
): Promise<void> {
  const db = getFirebaseFirestore()
  if (!db) throw new Error('AUTH_NOT_CONFIGURED')
  const ref = doc(db, SERVICE_REQUESTS_COLLECTION, requestId)
  await updateDoc(ref, {
    status: 'completed',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteServiceRequest(
  _uid: string,
  requestId: string
): Promise<void> {
  const db = getFirebaseFirestore()
  if (!db) throw new Error('AUTH_NOT_CONFIGURED')
  await deleteDoc(doc(db, SERVICE_REQUESTS_COLLECTION, requestId))
}

export function subscribeServiceRequests(
  uid: string,
  onNext: (items: ServiceRequestRecord[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const col = serviceRequestsCollectionRef()
  if (!col) {
    onNext([])
    return () => {}
  }

  /** Só `where` — ordenamos no cliente para não exigir índice composto no Firestore. */
  const q = query(col, where('userId', '==', uid))
  return onSnapshot(
    q,
    (snap) => {
      const items: ServiceRequestRecord[] = []
      for (const d of snap.docs) {
        const row = mapDoc(d.id, d.data() as Record<string, unknown>)
        if (row && row.userId === uid) items.push(row)
      }
      items.sort((a, b) => {
        const ta = a.createdAt?.getTime() ?? 0
        const tb = b.createdAt?.getTime() ?? 0
        return tb - ta
      })
      onNext(items)
    },
    (err) => {
      onError?.(err)
    }
  )
}
