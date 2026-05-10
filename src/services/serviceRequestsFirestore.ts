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
import type { ServiceRequestRecord, ServiceRequestStatus } from '../types/serviceRequest'
import { getGuestSessionReservationCode } from '../lib/guestAccess'

/**
 * Coleção de topo (uma “tabela” de pedidos).
 * Cada documento tem `userId` — o dono lê o seu; admin pode ver todos (ver firestore.rules).
 */
export const SERVICE_REQUESTS_COLLECTION = 'serviceRequests'
const LOCAL_SERVICE_REQUESTS_KEY = 'zen_local_service_requests_v1'
const LOCAL_SERVICE_REQUESTS_EVENT = 'zen:local-service-requests:changed'

function isNonEmptyStringId(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
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
  if (!isNonEmptyStringId(serviceId)) return null
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
    serviceId: serviceId.trim(),
    serviceName: toNullableString(data.serviceName),
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

type LocalServiceRequestRow = {
  id: string
  userId: string
  serviceId: string
  serviceName: string | null
  priceInCents: number
  requesterName: string | null
  reservationCode: string | null
  propertyName: string | null
  status: ServiceRequestStatus
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

function isGuestUid(uid: string): boolean {
  return uid.startsWith('guest-')
}

function readLocalRows(): LocalServiceRequestRow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_SERVICE_REQUESTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as LocalServiceRequestRow[]
  } catch {
    return []
  }
}

function writeLocalRows(rows: LocalServiceRequestRow[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LOCAL_SERVICE_REQUESTS_KEY, JSON.stringify(rows))
  window.dispatchEvent(new Event(LOCAL_SERVICE_REQUESTS_EVENT))
}

function localRowToRecord(row: LocalServiceRequestRow): ServiceRequestRecord {
  const toMaybeDate = (value: string | null) => (value ? new Date(value) : null)
  return {
    id: row.id,
    userId: row.userId,
    serviceId: row.serviceId,
    serviceName: row.serviceName,
    priceInCents: row.priceInCents,
    requesterName: row.requesterName,
    reservationCode: row.reservationCode,
    propertyName: row.propertyName,
    status: row.status,
    createdAt: toMaybeDate(row.createdAt),
    updatedAt: toMaybeDate(row.updatedAt),
    completedAt: toMaybeDate(row.completedAt),
  }
}

function listLocalRecordsByUid(uid: string): ServiceRequestRecord[] {
  const items = readLocalRows()
    .filter((row) => row.userId === uid)
    .map(localRowToRecord)
  items.sort((a, b) => {
    const ta = a.createdAt?.getTime() ?? 0
    const tb = b.createdAt?.getTime() ?? 0
    return tb - ta
  })
  return items
}

export async function createServiceRequest(
  uid: string,
  serviceId: string,
  priceInCents: number,
  metadata: {
    serviceName: string
    requesterName: string
    reservationCode: string
    propertyName: string
  }
): Promise<void> {
  if (isGuestUid(uid)) {
    const now = new Date().toISOString()
    const guestReservation = getGuestSessionReservationCode()
    const row: LocalServiceRequestRow = {
      id: `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      userId: uid,
      serviceId,
      serviceName: metadata.serviceName || null,
      priceInCents: Math.max(0, Math.round(priceInCents)),
      requesterName: metadata.requesterName || null,
      reservationCode: metadata.reservationCode || guestReservation || null,
      propertyName: metadata.propertyName || null,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    }
    const rows = readLocalRows()
    rows.unshift(row)
    writeLocalRows(rows)
    return
  }

  if (!isFirebaseConfigured()) throw new Error('AUTH_NOT_CONFIGURED')
  const col = serviceRequestsCollectionRef()
  if (!col) throw new Error('AUTH_NOT_CONFIGURED')
  const safePriceInCents = Math.max(0, Math.round(priceInCents))

  await addDoc(col, {
    userId: uid,
    serviceId,
    serviceName: metadata.serviceName,
    priceInCents: safePriceInCents,
    requesterName: metadata.requesterName,
    reservationCode: metadata.reservationCode,
    propertyName: metadata.propertyName,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

/** Admin / operador: concluir pedido só pelo id do documento (Firestore). */
export async function markServiceRequestCompletedById(requestId: string): Promise<void> {
  const db = getFirebaseFirestore()
  if (!db) throw new Error('AUTH_NOT_CONFIGURED')
  const ref = doc(db, SERVICE_REQUESTS_COLLECTION, requestId)
  await updateDoc(ref, {
    status: 'completed',
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function markServiceRequestCompleted(
  uid: string,
  requestId: string
): Promise<void> {
  if (isGuestUid(uid)) {
    const rows = readLocalRows()
    const now = new Date().toISOString()
    const next = rows.map((row) =>
      row.id === requestId && row.userId === uid
        ? { ...row, status: 'completed' as const, completedAt: now, updatedAt: now }
        : row
    )
    writeLocalRows(next)
    return
  }

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
  uid: string,
  requestId: string
): Promise<void> {
  if (isGuestUid(uid)) {
    const next = readLocalRows().filter(
      (row) => !(row.id === requestId && row.userId === uid)
    )
    writeLocalRows(next)
    return
  }

  const db = getFirebaseFirestore()
  if (!db) throw new Error('AUTH_NOT_CONFIGURED')
  await deleteDoc(doc(db, SERVICE_REQUESTS_COLLECTION, requestId))
}

export function subscribeServiceRequests(
  uid: string,
  onNext: (items: ServiceRequestRecord[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  if (isGuestUid(uid)) {
    const emit = () => onNext(listLocalRecordsByUid(uid))
    emit()
    if (typeof window === 'undefined') {
      return () => {}
    }

    const onLocalChanged = () => emit()
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_SERVICE_REQUESTS_KEY) emit()
    }

    window.addEventListener(LOCAL_SERVICE_REQUESTS_EVENT, onLocalChanged)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener(LOCAL_SERVICE_REQUESTS_EVENT, onLocalChanged)
      window.removeEventListener('storage', onStorage)
    }
  }

  const col = serviceRequestsCollectionRef()
  if (!col) {
    onNext([])
    return () => {}
  }

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

/** Listagem de todos os pedidos (vista do admin). */
export function subscribeServiceRequestsForAdmin(
  onNext: (items: ServiceRequestRecord[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const col = serviceRequestsCollectionRef()
  if (!col) {
    onNext([])
    return () => {}
  }
  return onSnapshot(
    col,
    (snap) => {
      const items: ServiceRequestRecord[] = []
      for (const d of snap.docs) {
        const row = mapDoc(d.id, d.data() as Record<string, unknown>)
        if (row) items.push(row)
      }
      items.sort((a, b) => {
        const ta = a.createdAt?.getTime() ?? 0
        const tb = b.createdAt?.getTime() ?? 0
        return tb - ta
      })
      onNext(items)
    },
    (err) => onError?.(err)
  )
}
