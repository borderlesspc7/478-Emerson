import { useMemo } from 'react'
import { mockGuestStay, mockServiceOffers } from '../data/mockGuestStay'
import type { GuestStay, ServiceOffer } from '../types/guestStay'

export type UseGuestStayResult = {
  stay: GuestStay
  serviceOffers: ServiceOffer[]
}

/**
 * Dados da estadia para o hóspede. Hoje: mock; depois: fetch Stays + cache.
 */
export function useGuestStay(): UseGuestStayResult {
  return useMemo(
    () => ({
      stay: mockGuestStay,
      serviceOffers: mockServiceOffers,
    }),
    []
  )
}
