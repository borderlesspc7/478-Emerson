import type { TFunction } from 'i18next'
import {
  formatGuestStayAccessErrorMessage,
  isGuestStayAccessError,
} from './guestStayAccessError'
import { firebaseErrorToMessage } from '../services/authService'

/**
 * Mensagem de erro de autenticação (login / magic link), com textos específicos
 * para estadia terminada vs. ainda antes do check-in.
 */
export function resolveAuthErrorMessage(
  error: unknown,
  t: TFunction,
  language: string,
): string {
  if (isGuestStayAccessError(error)) {
    return formatGuestStayAccessErrorMessage(error, t, language)
  }

  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: string }).code)
      : error instanceof Error
        ? error.message
        : 'unknown'

  if (code === 'stay/access-expired') {
    return t('guestAccessErrors.checkOutExpiredGeneric')
  }

  if (code === 'stay/check-out-expired') {
    return t('guestAccessErrors.checkOutExpiredGeneric')
  }

  if (code === 'stay/before-check-in') {
    return t('guestAccessErrors.beforeCheckInGeneric')
  }

  return firebaseErrorToMessage(code)
}
