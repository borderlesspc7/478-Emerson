/** Modelo alinhado ao que virá da API Stays; hoje preenchido por mock. */
export type GuestProperty = {
  name: string
  unit: string
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
}

export type ServiceOfferId = 'cleaning' | 'linen' | 'maintenance' | 'concierge'

export type ServiceOffer = {
  id: ServiceOfferId
  priceInCents: number
}
