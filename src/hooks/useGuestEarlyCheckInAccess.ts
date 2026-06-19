import { useEffect, useState } from 'react'
import { subscribeGuestAccessLink } from '../services/guestAccessLinkFirestore'
import type { AppUser } from '../types/user'

/**
 * Lê `earlyCheckInAccess` do vínculo Firestore em tempo real (admin pode alterar em Acessos).
 */
export function useGuestEarlyCheckInAccess(user: AppUser | null | undefined): boolean {
  const [earlyCheckInAccess, setEarlyCheckInAccess] = useState(
    () => user?.earlyCheckInAccess === true,
  )

  useEffect(() => {
    setEarlyCheckInAccess(user?.earlyCheckInAccess === true)
  }, [user?.earlyCheckInAccess])

  useEffect(() => {
    if (user?.role !== 'guest' || !user.reservationCode) return undefined
    return subscribeGuestAccessLink(user.reservationCode, (link) => {
      setEarlyCheckInAccess(link?.earlyCheckInAccess === true)
    })
  }, [user?.role, user?.reservationCode])

  return earlyCheckInAccess
}
