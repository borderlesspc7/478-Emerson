import {
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import type { PropertyCurationRecord } from '../types/propertyCuration'

export const PROPERTY_CURATIONS_COLLECTION = 'propertyCurations'

function toDate(v: unknown): Date | null {
  if (v && typeof v === 'object' && 'toDate' in v) {
    const d = (v as Timestamp).toDate()
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
}

export function mapPropertyCurationDoc(
  propertyId: string,
  data: Record<string, unknown>
): PropertyCurationRecord {
  return {
    propertyId,
    garagePhotoUrls: toStringArray(data.garagePhotoUrls),
    elevatorPhotoUrls: toStringArray(data.elevatorPhotoUrls),
    manualAccessTips: typeof data.manualAccessTips === 'string' ? data.manualAccessTips : '',
    manualPropertyTips: typeof data.manualPropertyTips === 'string' ? data.manualPropertyTips : '',
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
    updatedAt: toDate(data.updatedAt),
  }
}

export async function getPropertyCuration(
  propertyId: string
): Promise<PropertyCurationRecord | null> {
  if (!isFirebaseConfigured()) return null
  const db = getFirebaseFirestore()
  if (!db) return null
  const snap = await getDocFromServer(doc(db, PROPERTY_CURATIONS_COLLECTION, propertyId))
  if (!snap.exists()) return null
  return mapPropertyCurationDoc(propertyId, snap.data() as Record<string, unknown>)
}

export async function savePropertyCuration(
  propertyId: string,
  input: {
    garagePhotoUrls: string[]
    elevatorPhotoUrls: string[]
    manualAccessTips: string
    manualPropertyTips: string
    displayName?: string | null
  }
): Promise<void> {
  const db = getFirebaseFirestore()
  if (!db) throw new Error('AUTH_NOT_CONFIGURED')
  await setDoc(
    doc(db, PROPERTY_CURATIONS_COLLECTION, propertyId),
    {
      garagePhotoUrls: input.garagePhotoUrls,
      elevatorPhotoUrls: input.elevatorPhotoUrls,
      manualAccessTips: input.manualAccessTips,
      manualPropertyTips: input.manualPropertyTips,
      displayName: input.displayName ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export function subscribePropertyCurations(
  onNext: (items: PropertyCurationRecord[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const db = getFirebaseFirestore()
  if (!db) {
    onNext([])
    return () => {}
  }
  const col = collection(db, PROPERTY_CURATIONS_COLLECTION)
  return onSnapshot(
    col,
    (snap) => {
      const items: PropertyCurationRecord[] = []
      for (const d of snap.docs) {
        items.push(mapPropertyCurationDoc(d.id, d.data() as Record<string, unknown>))
      }
      onNext(items)
    },
    (err: Error) => onError?.(err)
  )
}
