import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import type { GuestAccessLinkRecord } from '../types/guestAccessLink'

export const GUEST_ACCESS_LINKS_COLLECTION = 'guestAccessLinks'

export function normalizeGuestAccessReservationCode(raw: string): string {
  return raw.trim().toUpperCase()
}

function toDate(v: unknown): Date | null {
  if (v && typeof v === 'object' && 'toDate' in v) {
    const d = (v as Timestamp).toDate()
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

export function mapGuestAccessLinkDoc(
  reservationCode: string,
  data: Record<string, unknown>
): GuestAccessLinkRecord | null {
  const propertyId = data.propertyId
  if (typeof propertyId !== 'string' || !propertyId.trim()) return null
  const accessActive = data.accessActive !== false
  return {
    reservationCode,
    propertyId: propertyId.trim(),
    accessActive,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getGuestAccessLink(
  reservationCode: string
): Promise<GuestAccessLinkRecord | null> {
  if (!isFirebaseConfigured()) return null
  const db = getFirebaseFirestore()
  if (!db) return null
  const id = normalizeGuestAccessReservationCode(reservationCode)
  const snap = await getDoc(doc(db, GUEST_ACCESS_LINKS_COLLECTION, id))
  if (!snap.exists()) return null
  return mapGuestAccessLinkDoc(id, snap.data() as Record<string, unknown>)
}

export async function upsertGuestAccessLink(input: {
  reservationCode: string
  propertyId: string
  accessActive?: boolean
}): Promise<void> {
  const db = getFirebaseFirestore()
  if (!db) throw new Error('AUTH_NOT_CONFIGURED')
  const id = normalizeGuestAccessReservationCode(input.reservationCode)
  const ref = doc(db, GUEST_ACCESS_LINKS_COLLECTION, id)
  const existing = await getDoc(ref)
  await setDoc(
    ref,
    {
      reservationCode: id,
      propertyId: input.propertyId.trim(),
      accessActive: input.accessActive !== false,
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  )
}

export function subscribeGuestAccessLinks(
  onNext: (items: GuestAccessLinkRecord[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const db = getFirebaseFirestore()
  if (!db) {
    onNext([])
    return () => {}
  }
  const col = collection(db, GUEST_ACCESS_LINKS_COLLECTION)
  return onSnapshot(
    col,
    (snap) => {
      const items: GuestAccessLinkRecord[] = []
      for (const d of snap.docs) {
        const row = mapGuestAccessLinkDoc(d.id, d.data() as Record<string, unknown>)
        if (row) items.push(row)
      }
      items.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
      onNext(items)
    },
    (err) => onError?.(err)
  )
}
