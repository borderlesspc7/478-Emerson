import type { TFunction } from 'i18next'
import { isBeforeCheckInTime, isStayCheckOutExpired, type StayWindow } from './auth'
import { formatStayDateTime } from './formatStayDates'

export type GuestStayAccessErrorCode =
  | 'stay/check-out-expired'
  | 'stay/before-check-in'
  | 'stay/access-expired'

export class GuestStayAccessError extends Error {
  readonly code: GuestStayAccessErrorCode
  readonly checkInAt: string
  readonly checkOutAt: string

  constructor(code: GuestStayAccessErrorCode, checkInAt: string, checkOutAt: string) {
    super(code)
    this.name = 'GuestStayAccessError'
    this.code = code
    this.checkInAt = checkInAt
    this.checkOutAt = checkOutAt
  }
}

/** Bloqueio no login do hóspede (magic link / código da reserva). */
export function getGuestLoginStayAccessError(
  stay: StayWindow & { checkInAt: string; checkOutAt: string },
  now = new Date(),
): GuestStayAccessError | null {
  if (isStayCheckOutExpired(stay, now)) {
    return new GuestStayAccessError('stay/check-out-expired', stay.checkInAt, stay.checkOutAt)
  }
  return null
}

/** Mensagem contextual para ecrãs (ex.: acesso expirado) com base nas datas da estadia. */
export function getStayAccessDisplayError(
  stay: StayWindow & { checkInAt: string; checkOutAt: string },
  now = new Date(),
): GuestStayAccessError | null {
  if (isStayCheckOutExpired(stay, now)) {
    return new GuestStayAccessError('stay/check-out-expired', stay.checkInAt, stay.checkOutAt)
  }
  if (isBeforeCheckInTime(stay, now)) {
    return new GuestStayAccessError('stay/before-check-in', stay.checkInAt, stay.checkOutAt)
  }
  return null
}

function formatLocale(language: string): string {
  return language === 'en' ? 'en' : 'pt-BR'
}

export function formatGuestStayAccessErrorMessage(
  error: GuestStayAccessError,
  t: TFunction,
  language: string,
): string {
  const loc = formatLocale(language)
  const checkInTime = formatStayDateTime(error.checkInAt, loc)
  const checkOutTime = formatStayDateTime(error.checkOutAt, loc)

  if (error.code === 'stay/check-out-expired' || error.code === 'stay/access-expired') {
    return t('guestAccessErrors.checkOutExpired', { checkOutTime })
  }

  return t('guestAccessErrors.beforeCheckIn', { checkInTime })
}

export function isGuestStayAccessError(error: unknown): error is GuestStayAccessError {
  return error instanceof GuestStayAccessError
}
