import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  browserLocalPersistence,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'
import type { FirestoreUserDocument } from '../types/firestoreUser'
import type { AppUser } from '../types/user'
import {
  fetchUserProfileFromFirestore,
  syncUserProfileToFirestore,
} from './userProfileFirestore'

function mapUser(
  u: User,
  profile: FirestoreUserDocument | null = null
): AppUser {
  return {
    uid: u.uid,
    role: 'admin',
    email: u.email,
    displayName: u.displayName ?? profile?.displayName ?? null,
    photoURL: u.photoURL ?? profile?.photoURL ?? null,
    reservationCode: profile?.reservationCode ?? null,
  }
}

export function subscribeAuth(
  onUser: (user: AppUser | null) => void,
  onError?: (e: Error) => void
): () => void {
  const auth = getFirebaseAuth()
  if (!auth) {
    onUser(null)
    return () => {}
  }

  return onAuthStateChanged(
    auth,
    (firebaseUser) => {
      if (!firebaseUser) {
        onUser(null)
        return
      }
      void (async () => {
        const uid = firebaseUser.uid
        try {
          await syncUserProfileToFirestore(firebaseUser)
        } catch (e) {
          console.error('[Firestore] syncUserProfileToFirestore', e)
        }
        const current = auth.currentUser
        if (!current || current.uid !== uid) return

        let profile: FirestoreUserDocument | null = null
        try {
          profile = await fetchUserProfileFromFirestore(uid)
        } catch (e) {
          console.error('[Firestore] fetchUserProfileFromFirestore', e)
        }
        if (!auth.currentUser || auth.currentUser.uid !== uid) return
        onUser(mapUser(auth.currentUser, profile))
      })()
    },
    (err) => {
      onError?.(err)
      onUser(null)
    }
  )
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AppUser> {
  const auth = getFirebaseAuth()
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('AUTH_NOT_CONFIGURED')
  }

  await setPersistence(auth, browserLocalPersistence)
  await signInWithEmailAndPassword(auth, email.trim(), password)
  const u = auth.currentUser
  if (!u) {
    throw new Error('auth/user-missing')
  }
  await syncUserProfileToFirestore(u)
  const profile = await fetchUserProfileFromFirestore(u.uid)
  return mapUser(u, profile)
}

/** Cadastro por e-mail (Firebase Auth). Exige provedor E-mail/senha ativo no projeto. */
export async function registerWithEmail(
  email: string,
  password: string
): Promise<AppUser> {
  const auth = getFirebaseAuth()
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('AUTH_NOT_CONFIGURED')
  }

  await setPersistence(auth, browserLocalPersistence)
  const cred = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  )
  await syncUserProfileToFirestore(cred.user)
  const profile = await fetchUserProfileFromFirestore(cred.user.uid)
  return mapUser(cred.user, profile)
}

export async function logout(): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth) return
  await signOut(auth)
}

export function firebaseErrorToMessage(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-disabled': 'Esta conta foi desativada.',
    'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Já existe uma conta com este e-mail. Use Entrar.',
    'auth/weak-password': 'Senha muito fraca. Use pelo menos 6 caracteres.',
    'auth/operation-not-allowed':
      'Cadastro por e-mail não está habilitado no Firebase (Authentication → Sign-in method).',
    'auth/too-many-requests':
      'Muitas tentativas. Tente novamente em alguns minutos.',
    'auth/network-request-failed': 'Falha de rede. Verifique sua conexão.',
    'auth/invalid-api-key': 'Configuração do app inválida.',
    AUTH_NOT_CONFIGURED:
      'Autenticação não configurada. Verifique as variáveis de ambiente.',
    'auth/user-missing': 'Sessão inválida após o login. Tente novamente.',
    'reservation/not-found':
      'Reserva não encontrada. Confirme o código liberado pelo administrador.',
  }

  return map[code] ?? 'Não foi possível entrar. Tente novamente.'
}
