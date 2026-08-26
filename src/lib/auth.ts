export type StayWindow = {
  checkInAt?: string | Date | null
  checkOutAt?: string | Date | null
}

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export type StayAccessState =
  | 'invalid'
  | 'pre-check-in'
  | 'active'
  | 'expired'

/** Estado canônico da janela, incluindo datas ausentes/invertidas. */
export function getStayAccessState(
  stay: StayWindow,
  now = new Date(),
): StayAccessState {
  const checkIn = toDate(stay.checkInAt)
  const checkOut = toDate(stay.checkOutAt)
  if (!checkIn || !checkOut || checkOut.getTime() < checkIn.getTime()) {
    return 'invalid'
  }
  if (now < checkIn) return 'pre-check-in'
  if (now > checkOut) return 'expired'
  return 'active'
}

/** Após o horário de check-out da Stays. */
export function isStayCheckOutExpired(stay: StayWindow, now = new Date()): boolean {
  const checkOut = toDate(stay.checkOutAt)
  if (!checkOut) return false
  return now > checkOut
}

/** Antes do horário exato de check-in da Stays. */
export function isBeforeCheckInTime(stay: StayWindow, now = new Date()): boolean {
  const checkIn = toDate(stay.checkInAt)
  if (!checkIn) return false
  return now < checkIn
}

/** Hóspede deve ficar na página de pré-check-in (aguardar horário da Stays). */
export function isGuestPreCheckInLocked(
  stay: StayWindow,
  options?: { earlyCheckInAccess?: boolean },
  now = new Date(),
): boolean {
  if (options?.earlyCheckInAccess) return false
  return isBeforeCheckInTime(stay, now)
}

/**
 * Janela completa da plataforma: a partir do horário de check-in até ao check-out.
 */
export function isStayAccessActive(stay: StayWindow, now = new Date()): boolean {
  return getStayAccessState(stay, now) === 'active'
}

/** Hóspede autenticado antes do check-in, mas ainda dentro da reserva (antes do check-out). */
export function isStayPreCheckIn(stay: StayWindow, now = new Date()): boolean {
  return getStayAccessState(stay, now) === 'pre-check-in'
}
