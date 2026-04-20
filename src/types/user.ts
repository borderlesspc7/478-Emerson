import type { GuestStay, ServiceOffer } from './guestStay'

export interface AppUser {
  uid: string
  role?: 'guest' | 'admin'
  email: string | null
  displayName: string | null
  photoURL: string | null
  reservationCode?: string | null
  stay?: {
    checkInAt?: string | null
    checkOutAt?: string | null
    propertyName?: string | null
    unit?: string | null
  }
  /** Preenchido para hóspedes com integração Stays (substitui mock de estadia). */
  guestStay?: GuestStay | null
  /** Catálogo de serviços extras com preços (API ou fallback). */
  serviceOffers?: ServiceOffer[] | null
}
