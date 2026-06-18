import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

let initialized = false

function loadServiceAccount() {
  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (jsonEnv?.trim()) {
    return JSON.parse(jsonEnv)
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (credPath) {
    const absolute = resolve(credPath)
    if (existsSync(absolute)) {
      return JSON.parse(readFileSync(absolute, 'utf8'))
    }
  }

  throw new Error(
    'Firebase Admin: defina FIREBASE_SERVICE_ACCOUNT_JSON (JSON em uma linha) ou GOOGLE_APPLICATION_CREDENTIALS.',
  )
}

export function getAdminApp() {
  if (initialized && admin.apps.length > 0) {
    return admin.app()
  }
  const serviceAccount = loadServiceAccount()
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
  initialized = true
  return admin.app()
}

export function adminDb() {
  return getAdminApp().firestore()
}

export function adminAuth() {
  return getAdminApp().auth()
}

export async function verifyIdToken(authorizationHeader) {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    throw new Error('auth/missing-token')
  }
  const token = authorizationHeader.slice('Bearer '.length).trim()
  if (!token) throw new Error('auth/missing-token')
  return adminAuth().verifyIdToken(token)
}
