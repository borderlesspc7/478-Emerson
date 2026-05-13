import { PATHS } from '../routes/path'
import { normalizeGuestAccessReservationCode } from '../services/guestAccessLinkFirestore'

/** Caminho relativo (React Router), ex.: `/entrar/IZ07J`. */
export function guestDirectEntryPath(reservationCode: string): string {
  const id = normalizeGuestAccessReservationCode(reservationCode.trim())
  return `${PATHS.guestDirectEntry}/${encodeURIComponent(id)}`
}

/** URL absoluta para partilhar com o hóspede (só no browser). */
export function guestDirectEntryAbsUrl(reservationCode: string): string {
  const path = guestDirectEntryPath(reservationCode)
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}
