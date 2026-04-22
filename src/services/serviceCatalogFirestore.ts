import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import type { ServiceCatalogItem } from '../types/serviceCatalog'

export const SERVICE_CATALOG_COLLECTION = 'serviceCatalog'

function catalogRef() {
  const db = getFirebaseFirestore()
  if (!db) return null
  return collection(db, SERVICE_CATALOG_COLLECTION)
}

function toItem(id: string, data: Record<string, unknown>): ServiceCatalogItem | null {
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name) return null
  const description = typeof data.description === 'string' ? data.description : ''
  const raw = data.priceInCents
  const priceInCents =
    typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0
  const order = typeof data.order === 'number' && Number.isFinite(data.order) ? data.order : 0
  return { id, name, description, priceInCents, order }
}

/**
 * Subscrição em tempo real: toda a coleção; ordenação por `order` e nome no cliente
 * (evita `orderBy` e índice extra no Firestore).
 */
export function subscribeServiceCatalog(
  onNext: (items: ServiceCatalogItem[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const col = catalogRef()
  if (!isFirebaseConfigured() || !col) {
    onNext([])
    return () => {}
  }

  // Ouvinte na coleção inteira (sem orderBy) evita exigir índice composto; ordenamos no cliente.
  return onSnapshot(
    col,
    (snap) => {
      const items: ServiceCatalogItem[] = []
      for (const d of snap.docs) {
        const row = toItem(d.id, d.data() as Record<string, unknown>)
        if (row) items.push(row)
      }
      items.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'))
      onNext(items)
    },
    (err) => onError?.(err)
  )
}

export async function addServiceCatalogItem(input: {
  name: string
  description: string
  priceInCents: number
}): Promise<string> {
  if (!isFirebaseConfigured()) throw new Error('FIREBASE_NOT_CONFIGURED')
  const col = catalogRef()
  if (!col) throw new Error('FIREBASE_NOT_CONFIGURED')

  const now = await getMaxOrder()
  const ref = await addDoc(col, {
    name: input.name.trim(),
    description: (input.description || '').trim(),
    priceInCents: Math.max(0, Math.round(input.priceInCents)),
    order: now + 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

async function getMaxOrder(): Promise<number> {
  const col = catalogRef()
  if (!col) return 0
  const snap = await getDocs(col)
  let max = 0
  for (const d of snap.docs) {
    const o = d.data().order
    if (typeof o === 'number' && Number.isFinite(o) && o > max) max = o
  }
  return max
}

export async function updateServiceCatalogItem(
  id: string,
  input: { name: string; description: string; priceInCents: number }
): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error('FIREBASE_NOT_CONFIGURED')
  const db = getFirebaseFirestore()
  if (!db) throw new Error('FIREBASE_NOT_CONFIGURED')
  const ref = doc(db, SERVICE_CATALOG_COLLECTION, id)
  await updateDoc(ref, {
    name: input.name.trim(),
    description: (input.description || '').trim(),
    priceInCents: Math.max(0, Math.round(input.priceInCents)),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteServiceCatalogItem(id: string): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error('FIREBASE_NOT_CONFIGURED')
  const db = getFirebaseFirestore()
  if (!db) throw new Error('FIREBASE_NOT_CONFIGURED')
  await deleteDoc(doc(db, SERVICE_CATALOG_COLLECTION, id))
}
