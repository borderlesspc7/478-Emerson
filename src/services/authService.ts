import {
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  browserLocalPersistence,
  type User,
} from 'firebase/auth'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'
import type { AppUser } from '../types/user'

function mapUser(u: User): AppUser {
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
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
    (firebaseUser) => onUser(firebaseUser ? mapUser(firebaseUser) : null),
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
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
  return mapUser(cred.user)
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
    'auth/too-many-requests':
      'Muitas tentativas. Tente novamente em alguns minutos.',
    'auth/network-request-failed': 'Falha de rede. Verifique sua conexão.',
    'auth/invalid-api-key': 'Configuração do app inválida.',
    AUTH_NOT_CONFIGURED:
      'Autenticação não configurada. Verifique as variáveis de ambiente.',
  }

  return map[code] ?? 'Não foi possível entrar. Tente novamente.'
}
