import { useEffect, useState } from 'react'
import { subscribeGuestAccessLink } from '../services/guestAccessLinkFirestore'
import type { AppUser } from '../types/user'

export type GuestAccessSettings = {
  earlyCheckInAccess: boolean
  accessReleaseTime: string | null
}

/**
 * Lê `earlyCheckInAccess` do vínculo Firestore em tempo real (admin pode alterar em Acessos).
 */
export function useGuestAccessSettings(
  user: AppUser | null | undefined,
): GuestAccessSettings {
  const reservationCode = user?.role === 'guest' ? user.reservationCode ?? null : null
  const [liveSettings, setLiveSettings] = useState<{
    reservationCode: string
    value: GuestAccessSettings
  } | null>(null)

  useEffect(() => {
    if (!reservationCode) return undefined
    return subscribeGuestAccessLink(reservationCode, (link) => {
      setLiveSettings({
        reservationCode,
        value: {
          earlyCheckInAccess: link?.earlyCheckInAccess === true,
          accessReleaseTime: link?.accessReleaseTime ?? null,
        },
      })
    })
  }, [reservationCode])

  if (reservationCode && liveSettings?.reservationCode === reservationCode) {
    return liveSettings.value
  }
  return {
    earlyCheckInAccess: user?.earlyCheckInAccess === true,
    accessReleaseTime: user?.accessReleaseTime ?? null,
  }
}

/** Compatibilidade para consumidores que só precisam da exceção de acesso imediato. */
export function useGuestEarlyCheckInAccess(user: AppUser | null | undefined): boolean {
  return useGuestAccessSettings(user).earlyCheckInAccess
}
