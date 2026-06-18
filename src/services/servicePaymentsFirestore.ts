import {
  collection,
  doc,
  onSnapshot,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import type { ServicePaymentRecord, ServicePaymentStatus } from '../types/servicePayment'

export const SERVICE_PAYMENTS_COLLECTION = 'servicePayments'

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

function normalizePaymentStatus(v: unknown): ServicePaymentStatus {
  const s = String(v || '').toLowerCase()
  if (s === 'paid') return 'paid'
  if (s === 'failed') return 'failed'
  if (s === 'expired') return 'expired'
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  return 'awaiting_payment'
}

function mapPaymentDoc(id: string, data: Record<string, unknown>): ServicePaymentRecord | null {
  const userId = data.userId
  const serviceId = data.serviceId
  if (typeof userId !== 'string' || !userId) return null
  if (typeof serviceId !== 'string' || !serviceId) return null

  const rawPrice = data.priceInCents
  const priceInCents =
    typeof rawPrice === 'number' && Number.isFinite(rawPrice)
      ? Math.max(0, Math.round(rawPrice))
      : 0

  const method = data.paymentMethod
  const paymentMethod = method === 'credit_card' || method === 'pix' ? method : null

  return {
    id,
    userId,
    serviceId,
    serviceName: toNullableString(data.serviceName),
    priceInCents,
    paymentMethod,
    paymentStatus: normalizePaymentStatus(data.paymentStatus),
    requesterName: toNullableString(data.requesterName),
    reservationCode: toNullableString(data.reservationCode),
    propertyName: toNullableString(data.propertyName),
    serviceRequestId: toNullableString(data.serviceRequestId),
    pixQrCode: toNullableString(data.pixQrCode),
    pixQrCodeUrl: toNullableString(data.pixQrCodeUrl),
    pixExpiresAt: toNullableString(data.pixExpiresAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    paidAt: toDate(data.paidAt),
  }
}

export function subscribeServicePayment(
  paymentId: string,
  uid: string,
  onNext: (record: ServicePaymentRecord | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onNext(null)
    return () => {}
  }

  const db = getFirebaseFirestore()
  if (!db) {
    onNext(null)
    return () => {}
  }

  const ref = doc(collection(db, SERVICE_PAYMENTS_COLLECTION), paymentId)
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onNext(null)
        return
      }
      const row = mapPaymentDoc(snap.id, snap.data() as Record<string, unknown>)
      if (row && row.userId !== uid) {
        onNext(null)
        return
      }
      onNext(row)
    },
    (err) => onError?.(err),
  )
}
