import { useMemo } from 'react'
import { mockGuestStay, mockServiceOffers } from '../data/mockGuestStay'
import { useAuth } from './useAuth'
import { useServiceCatalog } from './useServiceCatalog'
import type { GuestStay, ServiceOffer } from '../types/guestStay'
import type { ServiceCatalogItem } from '../types/serviceCatalog'

export type UseGuestStayResult = {
  stay: GuestStay
  /** Catálogo efetivo para o hóspede (Firestore, Stays ou mock). */
  serviceOffers: ServiceOffer[]
  /** Itens do catálogo Firestore (vazio se não houver Firebase); o admin gere estes. */
  catalogItems: ServiceCatalogItem[]
  catalogReady: boolean
  catalogError: string | null
}

function catalogToOffers(items: ServiceCatalogItem[]): ServiceOffer[] {
  return items.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    priceInCents: c.priceInCents,
  }))
}

/**
 * Dados da estadia e ofertas de serviço: prioridade catálogo Firestore → extras Stays (`user.serviceOffers`) → mock.
 */
export function useGuestStay(): UseGuestStayResult {
  const { user } = useAuth()
  const { items: catalogItems, ready: catalogReady, error: catalogError } = useServiceCatalog()

  return useMemo(() => {
    const resolveOffers = (): ServiceOffer[] => {
      if (catalogReady && catalogItems.length > 0) {
        return catalogToOffers(catalogItems)
      }
      const stays = user?.serviceOffers
      if (stays && stays.length > 0) {
        return stays
      }
      return mockServiceOffers
    }

    const serviceOffers = resolveOffers()

    if (user?.role === 'guest' && user.guestStay) {
      const stay: GuestStay = {
        ...user.guestStay,
        reservationCode: user.reservationCode ?? user.guestStay.reservationCode,
      }
      return {
        stay,
        serviceOffers,
        catalogItems,
        catalogReady,
        catalogError,
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
      serviceOffers,
      catalogItems,
      catalogReady,
      catalogError,
    }
  }, [user, catalogItems, catalogReady, catalogError])
}
