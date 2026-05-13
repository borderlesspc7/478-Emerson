import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getFirebaseFirestore, isFirebaseConfigured } from '../lib/firebase'
import { buildSimplifiedDeviceInfo } from '../lib/deviceInfo'

export const SECURITY_LOGS_COLLECTION = 'securityLogs'

export type GuestLoginFailureReason =
  | 'auth/invalid-reservation-format'
  | 'stays/reservation-canceled'
  | 'stay/access-expired'
  | 'stays/not-found'
  | 'stays/unauthorized'
  | 'stays/forbidden'
  | 'stays/network'
  | 'stays/server-error'
  | 'stays/invalid-id'
  | 'stays/request-failed'
  | 'unknown'

/**
 * Regista tentativa de login de hóspede falhada (código inválido, expirado, reserva cancelada, etc.).
 * Escrita pode ser feita sem sessão (regras Firestore permitem create com payload limitado).
 */
export async function logGuestLoginFailure(input: {
  attemptedReservationCode: string
  reason: GuestLoginFailureReason | string
}): Promise<void> {
  if (!isFirebaseConfigured()) return
  const db = getFirebaseFirestore()
  if (!db) return

  const code = input.attemptedReservationCode.trim().slice(0, 40)
  const reason = String(input.reason).slice(0, 96)
  const deviceInfo =
    typeof navigator !== 'undefined'
      ? buildSimplifiedDeviceInfo(navigator.userAgent)
      : '—'

  try {
    await addDoc(collection(db, SECURITY_LOGS_COLLECTION), {
      attemptedReservationCode: code || '(vazio)',
      reason: reason || 'unknown',
      deviceInfo,
      createdAt: serverTimestamp(),
    })
  } catch {
    /* não bloquear o fluxo de login por falha de analytics */
  }
}
