/** Vínculo manual reserva ↔ imóvel (`guestAccessLinks`), id do doc = código reserva normalizado. */
export type GuestAccessLinkRecord = {
  reservationCode: string
  propertyId: string
  accessActive: boolean
  createdAt: Date | null
  updatedAt: Date | null
}
