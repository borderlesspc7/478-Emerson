import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import { normalizeGuestAccessReservationCode } from './guestAccessLinkFirestore'
import type { FirestoreUserDocument } from '../types/firestoreUser'

const USERS_COLLECTION = 'users'

/** Evita `getDoc`/`setDoc` concorrentes no mesmo `users/{uid}` (ex.: login JIT + `onAuthStateChanged`). */
const userDocSerializedChains = new Map<string, Promise<unknown>>()

function runSerializedUserDocOperation<T>(uid: string, op: () => Promise<T>): Promise<T> {
  const previous = userDocSerializedChains.get(uid) ?? Promise.resolve()
  const next = previous.then(op, op)
  userDocSerializedChains.set(
    uid,
    next.then(
      () => undefined,
      () => undefined,
    ),
  )
  return next
}

function userDocRef(uid: string) {
  const db = getFirebaseFirestore()
  if (!db) return null
  return doc(db, USERS_COLLECTION, uid)
}

/**
 * Cria ou atualiza `users/{uid}` com dados do Auth (merge).
 * Na primeira vez grava `createdAt`; depois só atualiza `updatedAt` e campos de perfil.
 */
/**
 * Perfil mínimo de hóspede (JIT) — deve ser gravado antes do restante do fluxo depender do Firestore.
 */
export async function ensureGuestProfileDocument(
  uid: string,
  data: {
    reservationCode: string
    displayName: string
    email: string | null
  }
): Promise<void> {
  if (!isFirebaseConfigured()) return
  const ref = userDocRef(uid)
  if (!ref) return

  await runSerializedUserDocOperation(uid, async () => {
    const snap = await getDoc(ref)
    const isNew = !snap.exists()

    const payload: Record<string, unknown> = {
      role: 'guest',
      reservationCode: normalizeGuestAccessReservationCode(data.reservationCode),
      displayName: data.displayName,
      email: data.email,
      updatedAt: serverTimestamp(),
    }

    if (isNew) {
      payload.createdAt = serverTimestamp()
    }

    await setDoc(ref, payload, { merge: true })
  })
}

export async function syncUserProfileToFirestore(user: User): Promise<void> {
  if (!isFirebaseConfigured()) return

  const ref = userDocRef(user.uid)
  if (!ref) return

  await runSerializedUserDocOperation(user.uid, async () => {
    const snap = await getDoc(ref)
    const isNew = !snap.exists()

    const emailLower = user.email?.toLowerCase() ?? ''
    const isGuestEmail = emailLower.endsWith('@zen.com.br')

    const payload: Record<string, unknown> = {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
    }

    if (!isGuestEmail) {
      const prevRole = snap.data()?.['role'] as string | undefined
      if (prevRole !== 'guest') {
        payload.role = 'admin'
      }
    }

    if (isNew) {
      payload.createdAt = serverTimestamp()
    }

    await setDoc(ref, payload, { merge: true })
  })
}

/** Lê o perfil guardado no Firestore (opcional: enriquecer UI). */
export async function fetchUserProfileFromFirestore(
  uid: string
): Promise<FirestoreUserDocument | null> {
  const ref = userDocRef(uid)
  if (!ref) return null

  return runSerializedUserDocOperation(uid, async () => {
    const snap = await getDoc(ref)
    if (!snap.exists()) return null

    const d = snap.data()
    return {
      email: (d.email as string | null) ?? null,
      displayName: (d.displayName as string | null) ?? null,
      photoURL: (d.photoURL as string | null) ?? null,
      createdAt: (d.createdAt as Timestamp | undefined) ?? null,
      updatedAt: (d.updatedAt as Timestamp | undefined) ?? null,
      reservationCode: (d.reservationCode as string | null | undefined) ?? null,
      role: (d.role as FirestoreUserDocument['role'] | undefined) ?? null,
    }
  })
}
