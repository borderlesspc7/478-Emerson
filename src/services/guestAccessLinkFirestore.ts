import {
  collection,
  doc,
  getDocFromServer,
  increment,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import { buildSimplifiedDeviceInfo } from '../lib/deviceInfo'
import type { GuestAccessLinkRecord } from '../types/guestAccessLink'

export const GUEST_ACCESS_LINKS_COLLECTION = 'guestAccessLinks'

export function normalizeGuestAccessReservationCode(raw: string): string {
  const s = raw
    .trim()
    .toUpperCase()
    .replace(/\//g, '-')
    .replace(/\\/g, '-')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .slice(0, 800)
  if (!s) return ''
  if (/^\.+$/.test(s)) return 'EMPTY'
  return s
}

function scrubCustomFieldVisibility(
  input: Record<string, boolean> | null | undefined,
): Record<string, boolean> | undefined {
  if (!input || typeof input !== 'object') return undefined
  const out: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(input)) {
    if (typeof v !== 'boolean') continue
    const key = String(k).trim().slice(0, 300)
    if (!key) continue
    out[key] = v
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function toDate(v: unknown): Date | null {
  if (v && typeof v === 'object' && 'toDate' in v) {
    const d = (v as Timestamp).toDate()
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v))
  return null
}

function parseCustomFieldVisibility(data: unknown): Record<string, boolean> | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const o = data as Record<string, unknown>
  const out: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'boolean') out[k] = v
  }
  return Object.keys(out).length > 0 ? out : null
}

export function mapGuestAccessLinkDoc(
  reservationCode: string,
  data: Record<string, unknown>
): GuestAccessLinkRecord | null {
  const propertyId = data.propertyId
  if (typeof propertyId !== 'string' || !propertyId.trim()) return null
  const accessActive = data.accessActive !== false
  const accessCount = toNumber(data.accessCount) ?? 0
  const deviceInfo =
    typeof data.deviceInfo === 'string' && data.deviceInfo.trim()
      ? data.deviceInfo.trim().slice(0, 500)
      : null
  return {
    reservationCode,
    propertyId: propertyId.trim(),
    accessActive,
    customFieldVisibility: parseCustomFieldVisibility(data.customFieldVisibility),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    lastAccessAt: toDate(data.lastAccessAt),
    deviceInfo,
    accessCount,
  }
}

export async function getGuestAccessLink(
  reservationCode: string
): Promise<GuestAccessLinkRecord | null> {
  if (!isFirebaseConfigured()) return null
  const db = getFirebaseFirestore()
  if (!db) return null
  const id = normalizeGuestAccessReservationCode(reservationCode)
  if (!id) return null
  const snap = await getDocFromServer(doc(db, GUEST_ACCESS_LINKS_COLLECTION, id))
  if (!snap.exists()) return null
  return mapGuestAccessLinkDoc(id, snap.data() as Record<string, unknown>)
}

export async function upsertGuestAccessLink(input: {
  reservationCode: string
  propertyId: string
  accessActive?: boolean
  customFieldVisibility?: Record<string, boolean> | null
}): Promise<void> {
  const db = getFirebaseFirestore()
  if (!db) throw new Error('AUTH_NOT_CONFIGURED')
  const id = normalizeGuestAccessReservationCode(input.reservationCode)
  if (!id) {
    throw new Error('guest-access/invalid-reservation-code')
  }
  const pid = input.propertyId.trim()
  if (!pid) {
    throw new Error('guest-access/invalid-property-id')
  }
  const ref = doc(db, GUEST_ACCESS_LINKS_COLLECTION, id)
  const existing = await getDocFromServer(ref)

  const visibility = scrubCustomFieldVisibility(
    input.customFieldVisibility === undefined
      ? undefined
      : input.customFieldVisibility ?? undefined,
  )

  const payload: Record<string, unknown> = {
    reservationCode: id,
    propertyId: pid,
    accessActive: input.accessActive !== false,
    updatedAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    ...(visibility !== undefined ? { customFieldVisibility: visibility } : {}),
  }

  await setDoc(ref, payload, { merge: true })
}

/**
 * Após login bem-sucedido: incrementa contador e grava último acesso (só se existir vínculo em `guestAccessLinks`).
 */
export async function recordGuestAccessLinkUsage(
  reservationCode: string
): Promise<void> {
  if (!isFirebaseConfigured()) return
  const db = getFirebaseFirestore()
  if (!db || typeof navigator === 'undefined') return

  const id = normalizeGuestAccessReservationCode(reservationCode)
  if (!id) return

  const ref = doc(db, GUEST_ACCESS_LINKS_COLLECTION, id)
  const snap = await getDocFromServer(ref)
  if (!snap.exists()) return

  const deviceInfo = buildSimplifiedDeviceInfo(navigator.userAgent).slice(0, 500)

  try {
    await updateDoc(ref, {
      lastAccessAt: serverTimestamp(),
      deviceInfo,
      accessCount: increment(1),
    })
  } catch {
    /* regras / rede: não falhar o login */
  }
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
      items.sort((a, b) => {
        const ta = a.lastAccessAt?.getTime() ?? a.updatedAt?.getTime() ?? 0
        const tb = b.lastAccessAt?.getTime() ?? b.updatedAt?.getTime() ?? 0
        return tb - ta
      })
      onNext(items)
    },
    (err) => onError?.(err)
  )
}
