import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
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

let app: FirebaseApp | null = null
let auth: Auth | null = null
let firestore: Firestore | null = null
let storage: FirebaseStorage | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (!isConfigValid()) return null
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp()
  if (!a) return null
  if (!auth) {
    auth = getAuth(a)
  }
  return auth
}

export function getFirebaseFirestore(): Firestore | null {
  const a = getFirebaseApp()
  if (!a) return null
  if (!firestore) {
    firestore = getFirestore(a)
  }
  return firestore
}

export function getFirebaseStorage(): FirebaseStorage | null {
  const a = getFirebaseApp()
  if (!a) return null
  if (!storage) {
    storage = getStorage(a)
  }
  return storage
}

export { isConfigValid as isFirebaseConfigured }
