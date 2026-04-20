import { useMemo } from 'react'
import { mockGuestStay, mockServiceOffers } from '../data/mockGuestStay'
import { useAuth } from './useAuth'
import type { GuestStay, ServiceOffer } from '../types/guestStay'

export type UseGuestStayResult = {
  stay: GuestStay
  serviceOffers: ServiceOffer[]
}

/**
 * Dados da estadia: integração Stays (`user.guestStay`) ou mock quando não configurado.
 */
export function useGuestStay(): UseGuestStayResult {
  const { user } = useAuth()

  return useMemo(() => {
    if (user?.role === 'guest' && user.guestStay) {
      const stay: GuestStay = {
        ...user.guestStay,
        reservationCode: user.reservationCode ?? user.guestStay.reservationCode,
      }
      return {
        stay,
        serviceOffers: user.serviceOffers ?? mockServiceOffers,
      }
    }

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
  }, [user])
}
