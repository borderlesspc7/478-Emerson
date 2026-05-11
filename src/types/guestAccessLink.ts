/** Vínculo manual reserva ↔ imóvel (`guestAccessLinks`), id do doc = código reserva normalizado. */
export type GuestAccessLinkRecord = {
  reservationCode: string
  propertyId: string
  accessActive: boolean
  /**
   * Visibilidade por campo personalizado Stays (`id` do campo como string).
   * Ausente ou vazio: o hóspede vê todos os campos devolvidos pela API.
   */
  customFieldVisibility: Record<string, boolean> | null
  createdAt: Date | null
  updatedAt: Date | null
}
