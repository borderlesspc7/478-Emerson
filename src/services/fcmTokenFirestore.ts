import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'

export const FCM_TOKENS_COLLECTION = 'fcmTokens'

function fcmTokenDocId(token: string): string {
  let hash = 0
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash << 5) - hash + token.charCodeAt(i)
    hash |= 0
  }
  return `web_${Math.abs(hash).toString(36)}_${token.slice(-16)}`
}

function fcmTokensCollectionRef() {
  const db = getFirebaseFirestore()
  if (!db) return null
  return collection(db, FCM_TOKENS_COLLECTION)
}

export async function saveFcmTokenForUser(
  userId: string,
  token: string,
): Promise<void> {
  if (!isFirebaseConfigured()) return
  const col = fcmTokensCollectionRef()
  if (!col) return

  const docId = fcmTokenDocId(token)
  const ref = doc(col, docId)
  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : null

  await setDoc(
    ref,
    {
      userId,
      token,
      platform: 'web',
      userAgent,
      active: true,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function deactivateFcmTokensForUser(userId: string): Promise<void> {
  if (!isFirebaseConfigured()) return
  const col = fcmTokensCollectionRef()
  if (!col) return

  const snap = await getDocs(query(col, where('userId', '==', userId)))
  await Promise.all(
    snap.docs.map((tokenDoc) =>
      setDoc(
        tokenDoc.ref,
        { active: false, updatedAt: serverTimestamp() },
        { merge: true },
      ),
    ),
  )
}

export async function deleteFcmTokensForUser(userId: string): Promise<void> {
  if (!isFirebaseConfigured()) return
  const col = fcmTokensCollectionRef()
  if (!col) return

  const snap = await getDocs(query(col, where('userId', '==', userId)))
  await Promise.all(snap.docs.map((tokenDoc) => deleteDoc(tokenDoc.ref)))
}

export function mapFcmTokenDoc(
  id: string,
  data: Record<string, unknown>,
): { id: string; userId: string; token: string; active: boolean } | null {
  const userId = data.userId
  const token = data.token
  if (typeof userId !== 'string' || typeof token !== 'string') return null
  return {
    id,
    userId,
    token,
    active: data.active !== false,
  }
}

export type { Timestamp }
