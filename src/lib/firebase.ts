import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

/** Configuração do app web Firebase (projeto emerson-1e6d2) — Console → Definições do projeto. */
const firebaseConfig = {
  apiKey: 'AIzaSyAlfuN-ClRQnwGUSA8o4IlrUbG873WZDRI',
  authDomain: 'emerson-1e6d2.firebaseapp.com',
  projectId: 'emerson-1e6d2',
  storageBucket: 'emerson-1e6d2.firebasestorage.app',
  messagingSenderId: '927933111658',
  appId: '1:927933111658:web:b0ac5cf6de0fcbc5c11913',
}

function isConfigValid(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId
  )
}

/**
 * Usa `getApps`/`getApp` para evitar `[DEFAULT] already exists` com HMR (Vite) e
 * para não manter referências a instâncias antigas do SDK entre recargas.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (!isConfigValid()) return null
  if (!getApps().length) {
    return initializeApp(firebaseConfig)
  }
  return getApp()
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp()
  if (!a) return null
  return getAuth(a)
}

export function getFirebaseFirestore(): Firestore | null {
  const a = getFirebaseApp()
  if (!a) return null
  return getFirestore(a)
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const a = getFirebaseApp()
  if (!a) return null
  return getStorage(a)
}

let messagingInstance: Messaging | null | undefined

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance !== undefined) return messagingInstance
  const supported = await isSupported()
  if (!supported) {
    messagingInstance = null
    return null
  }
  const app = getFirebaseApp()
  if (!app) {
    messagingInstance = null
    return null
  }
  messagingInstance = getMessaging(app)
  return messagingInstance
}

export { isConfigValid as isFirebaseConfigured }
