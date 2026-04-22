/** Modelo alinhado ao que virá da API Stays; hoje preenchido por mock. */
export type GuestProperty = {
  name: string
  unit: string
  /** Ex.: `apartment` da Stays, quando existir. */
  subtype?: string | null
  floor?: string | null
  addressLine: string
  city: string
  postalCode?: string | null
  /** Texto comercial do imóvel (ex.: descrição Stays HTML → texto). */
  description?: string | null
}

export type GuestWifi = {
  ssid: string
  password: string
}

export type GuestAccess = {
  summary: string
  /** Instruções detalhadas (porta, fechadura, cofre, etc.) */
  instructions: string
  doorPassword?: string | null
  floor?: string | null
  garageSpot?: string | null
}

export type GuestStay = {
  reservationCode: string
  property: GuestProperty
  /** ISO 8601 */
  checkInAt: string
  checkOutAt: string
  wifi: GuestWifi
  access: GuestAccess
  /** Observações gerais da hospedagem */
  notes?: string | null
  /** Composição do grupo (dados Stays `guestsDetails`, quando existirem). */
  party?: { adults: number; children: number; infants: number } | null
  /** Valor total da reserva na Stays, para exibição. */
  totalPrice?: { amount: number; currency: string } | null
}

/** Oferta exibida ao hóspede: catálogo Firestore, extras Stays ou mock de desenvolvimento. */
export type ServiceOffer = {
  id: string
  name: string
  description: string
  priceInCents: number
}
