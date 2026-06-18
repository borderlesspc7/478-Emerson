import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function isCloudRuntime(): boolean {
  return Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET || process.env.FUNCTIONS_EMULATOR)
}

export function ensureAdminApp() {
  if (getApps().length === 0) {
    // Credencial de ficheiro local (GOOGLE_APPLICATION_CREDENTIALS) não existe no Cloud Run.
    if (isCloudRuntime() && !process.env.FUNCTIONS_EMULATOR) {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS
    }
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
