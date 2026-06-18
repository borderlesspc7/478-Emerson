import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export function ensureAdminApp() {
  if (getApps().length === 0) {
    initializeApp()
  }
}

export function adminDb() {
  ensureAdminApp()
  return getFirestore()
}

export function adminAuth() {
  ensureAdminApp()
  return getAuth()
}

export async function verifyIdToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new Error('auth/missing-token')
  }
  const token = authorizationHeader.slice('Bearer '.length).trim()
  if (!token) throw new Error('auth/missing-token')
  return adminAuth().verifyIdToken(token)
}
