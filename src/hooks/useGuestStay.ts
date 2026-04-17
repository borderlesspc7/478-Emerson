import { useMemo } from 'react'
import { mockGuestStay, mockServiceOffers } from '../data/mockGuestStay'
import { useAuth } from './useAuth'
import type { GuestStay, ServiceOffer } from '../types/guestStay'

export type UseGuestStayResult = {
  stay: GuestStay
  serviceOffers: ServiceOffer[]
}

/**
 * Dados da estadia para o hóspede. Hoje: mock; depois: fetch Stays + cache.
 */
export function useGuestStay(): UseGuestStayResult {
  const { user } = useAuth()

  return useMemo(
    () => {
      const stay: GuestStay = {
        ...mockGuestStay,
        reservationCode: user?.reservationCode || mockGuestStay.reservationCode,
        checkInAt: user?.stay?.checkInAt || mockGuestStay.checkInAt,
        checkOutAt: user?.stay?.checkOutAt || mockGuestStay.checkOutAt,
      }

      return {
        stay,
        serviceOffers: mockServiceOffers,
      }
    },
    [user?.reservationCode, user?.stay?.checkInAt, user?.stay?.checkOutAt]
  )
}
