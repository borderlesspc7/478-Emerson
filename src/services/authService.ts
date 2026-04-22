import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  browserLocalPersistence,
  type User,
} from 'firebase/auth'
import { isStayAccessActive } from '../lib/auth'
import { parseStaysReservationUserInput } from '../lib/staysReservationInput'
import type { AppUser } from '../types/user'
import type { FirestoreUserDocument } from '../types/firestoreUser'
import { getFirebaseAuth, isFirebaseConfigured } from '../lib/firebase'
import { StaysApiError } from './staysClient'
import {
  fetchGuestProfileFromStays,
  fetchReservation,
  normalizeStaysReservationId,
} from './staysService'
import {
  ensureGuestProfileDocument,
  fetchUserProfileFromFirestore,
  syncUserProfileToFirestore,
} from './userProfileFirestore'
import {
  mapStaysToGuestStayBundle,
  pickPrimaryStaysGuest,
  serviceOffersForGuest,
  toStayIso,
} from './staysMapper'
import type { StaysBooking } from '../types/staysApi'

/** E-mail sintético Firebase: só caracteres seguros no local-part. */
export const GUEST_FIREBASE_EMAIL_DOMAIN = 'zen.com.br'

/** Senha padrão do app para hóspedes (também usada na criação JIT no Firebase Auth). */
export const GUEST_APP_DEFAULT_PASSWORD = '123456'

function mapUser(u: User, profile: FirestoreUserDocument | null = null): AppUser {
  const email = u.email
  const looksGuestEmail =
    email?.toLowerCase().endsWith(`@${GUEST_FIREBASE_EMAIL_DOMAIN}`) ?? false
  const fromProfile = profile?.role
  const role: AppUser['role'] =
    fromProfile === 'guest' || fromProfile === 'admin'
      ? fromProfile
      : looksGuestEmail
        ? 'guest'
        : 'admin'

  return {
    uid: u.uid,
    role,
    email,
    displayName: u.displayName ?? profile?.displayName ?? null,
    photoURL: u.photoURL ?? profile?.photoURL ?? null,
    reservationCode: profile?.reservationCode ?? null,
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms))
}

async function fetchUserProfileWithGuestRetry(
  uid: string,
  firebaseUser: User
): Promise<FirestoreUserDocument | null> {
  let profile = await fetchUserProfileFromFirestore(uid)
  const guestEmail = firebaseUser.email?.toLowerCase().endsWith(`@${GUEST_FIREBASE_EMAIL_DOMAIN}`)
  if (guestEmail && (!profile?.reservationCode || !profile?.role)) {
    for (let i = 0; i < 3; i++) {
      await sleep(80 * (i + 1))
      profile = await fetchUserProfileFromFirestore(uid)
      if (profile?.reservationCode && profile?.role === 'guest') break
    }
  }
  return profile
}

/**
 * Monta `AppUser` completo para hóspede (Stays + extras).
 */
async function enrichGuestAppUser(
  u: User,
  profile: FirestoreUserDocument | null,
  reservationCode: string
): Promise<AppUser> {
  const base = mapUser(u, profile)
  try {
    const bundle = await fetchGuestProfileFromStays(reservationCode)
    const displayName =
      bundle.primaryGuest?.name?.trim() ||
      profile?.displayName ||
      `Hóspede ${reservationCode}`

    return {
      ...base,
      role: 'guest',
      displayName,
      email: u.email,
      reservationCode,
      stay: {
        checkInAt: bundle.guestStay.checkInAt,
        checkOutAt: bundle.guestStay.checkOutAt,
        propertyName: bundle.guestStay.property.name,
        unit: bundle.guestStay.property.unit,
      },
      guestStay: bundle.guestStay,
      serviceOffers: bundle.serviceOffers,
    }
  } catch {
    try {
      const booking = await fetchReservation(reservationCode)
      const mini = mapStaysToGuestStayBundle(reservationCode, booking, null, null)
      const primary = pickPrimaryStaysGuest(booking)
      return {
        ...base,
        role: 'guest',
        displayName: primary?.name ?? profile?.displayName ?? `Hóspede ${reservationCode}`,
        reservationCode,
        stay: {
          checkInAt: mini.guestStay.checkInAt,
          checkOutAt: mini.guestStay.checkOutAt,
          propertyName: mini.guestStay.property.name,
          unit: mini.guestStay.property.unit,
        },
        guestStay: mini.guestStay,
        serviceOffers: serviceOffersForGuest([]),
      }
    } catch {
      const mini = mapStaysToGuestStayBundle(reservationCode, { id: reservationCode }, null, null)
      return {
        ...base,
        role: 'guest',
        reservationCode,
        stay: {
          checkInAt: mini.guestStay.checkInAt,
          checkOutAt: mini.guestStay.checkOutAt,
          propertyName: mini.guestStay.property.name,
          unit: mini.guestStay.property.unit,
        },
        guestStay: mini.guestStay,
        serviceOffers: serviceOffersForGuest([]),
      }
    }
  }
}

async function buildAppUser(u: User, profile: FirestoreUserDocument | null): Promise<AppUser> {
  const base = mapUser(u, profile)
  if (base.role === 'guest' && profile?.reservationCode) {
    return enrichGuestAppUser(u, profile, profile.reservationCode)
  }
  return base
}

export function reservationCodeToGuestEmail(reservationCode: string): string {
  const normalized = normalizeStaysReservationId(reservationCode)
  const local = normalized.replace(/[^A-Za-z0-9]/g, '')
  if (!local) {
    throw new Error('auth/invalid-reservation-format')
  }
  return `${local.toLowerCase()}@${GUEST_FIREBASE_EMAIL_DOMAIN}`
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

      const uid = firebaseUser.uid
      void (async () => {
        const current = auth.currentUser
        if (!current || current.uid !== uid) return

        try {
          await syncUserProfileToFirestore(firebaseUser)
        } catch (e) {
          console.error('[Firestore] syncUserProfileToFirestore', e)
        }

        if (!auth.currentUser || auth.currentUser.uid !== uid) return

        let profile: FirestoreUserDocument | null = null
        try {
          profile = await fetchUserProfileWithGuestRetry(uid, firebaseUser)
        } catch (e) {
          console.error('[Firestore] fetchUserProfileFromFirestore', e)
        }

        if (!auth.currentUser || auth.currentUser.uid !== uid) return

        try {
          const appUser = await buildAppUser(auth.currentUser, profile)
          if (!auth.currentUser || auth.currentUser.uid !== uid) return
          onUser(appUser)
        } catch (e) {
          console.error('[Auth] buildAppUser', e)
          onUser(mapUser(auth.currentUser, profile))
        }
      })()
    },
    (err) => {
      onError?.(err)
      onUser(null)
    }
  )
}

/**
 * Login de hóspede: valida Stays, período da estadia, depois Firebase (sign-in ou registo JIT).
 */
export async function loginWithStaysReservation(
  reservationCode: string,
  password: string
): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('AUTH_NOT_CONFIGURED')
  }

  if (password !== GUEST_APP_DEFAULT_PASSWORD) {
    throw new Error('guest/wrong-default-password')
  }

  const parsed = parseStaysReservationUserInput(reservationCode)
  const normalized = normalizeStaysReservationId(parsed)
  if (!normalized) {
    throw new Error('auth/invalid-reservation-format')
  }

  let booking: StaysBooking
  try {
    booking = await fetchReservation(normalized)
  } catch (e) {
    if (e instanceof StaysApiError && e.code === 'stays/not-configured') {
      throw e
    }
    if (e instanceof StaysApiError) {
      throw e
    }
    throw e
  }

  if (booking.type === 'canceled') {
    throw new Error('stays/reservation-canceled')
  }

  const checkInAt = toStayIso(booking.checkInDate, booking.checkInTime, false)
  const checkOutAt = toStayIso(booking.checkOutDate, booking.checkOutTime, true)

  if (!isStayAccessActive({ checkInAt, checkOutAt })) {
    throw new Error('stay/access-expired')
  }

  const email = reservationCodeToGuestEmail(normalized)
  const primaryGuest = pickPrimaryStaysGuest(booking)
  const displayName = primaryGuest?.name?.trim() ?? `Hóspede ${normalized}`

  await setPersistence(auth, browserLocalPersistence)

  let credUser: User
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    credUser = cred.user
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
    if (code === 'auth/user-not-found') {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      credUser = cred.user
    } else if (code === 'auth/invalid-credential') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        credUser = cred.user
      } catch (e2: unknown) {
        const c2 =
          e2 && typeof e2 === 'object' && 'code' in e2
            ? String((e2 as { code: string }).code)
            : ''
        if (c2 === 'auth/email-already-in-use') {
          throw new Error('auth/wrong-password')
        }
        throw e2
      }
    } else {
      throw e
    }
  }

  await ensureGuestProfileDocument(credUser.uid, {
    reservationCode: normalized,
    displayName,
    email: credUser.email ?? email,
  })
  await syncUserProfileToFirestore(credUser)
}

export async function loginWithEmail(email: string, password: string): Promise<AppUser> {
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
  return buildAppUser(u, profile)
}

export async function registerWithEmail(email: string, password: string): Promise<AppUser> {
  const auth = getFirebaseAuth()
  if (!auth || !isFirebaseConfigured()) {
    throw new Error('AUTH_NOT_CONFIGURED')
  }

  await setPersistence(auth, browserLocalPersistence)
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
  await syncUserProfileToFirestore(cred.user)
  const profile = await fetchUserProfileFromFirestore(cred.user.uid)
  return buildAppUser(cred.user, profile)
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
    'auth/invalid-reservation-format': 'Código da reserva inválido.',
    'reservation/not-found':
      'Reserva não encontrada na Stays. Confira o código e tente novamente.',
    'stays/unauthorized':
      'Não autorizado (401) na Stays. Verifique VITE_STAYS_LOGIN (client id), VITE_STAYS_PASSWORD (client secret) e a URL …/external/v1, sem espaços no .env; reinicie o npm run dev após alterar.',
    'stays/forbidden': 'Acesso negado à API Stays para esta operação.',
    'stays/network': 'Falha de rede ao contatar a Stays. Tente de novo.',
    'stays/server-error': 'Serviço Stays indisponível. Tente mais tarde.',
    'stays/invalid-id': 'Código de reserva em branco.',
    'stays/not-configured':
      'Integração Stays não configurada. Defina VITE_STAYS_* no ambiente.',
    'stays/reservation-canceled': 'Esta reserva está cancelada e não pode ser acessada.',
    'stay/access-expired':
      'O acesso ao painel só é permitido durante o período da estadia (check-in a check-out).',
    'guest/wrong-default-password': 'Senha incorreta. Use a senha padrão informada pela equipe.',
  }

  return map[code] ?? 'Não foi possível entrar. Tente novamente.'
}
