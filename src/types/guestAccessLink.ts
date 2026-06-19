/** Vínculo manual reserva ↔ imóvel (`guestAccessLinks`), id do doc = código reserva normalizado. */
export type GuestAccessLinkRecord = {
  reservationCode: string
  propertyId: string
  accessActive: boolean
  /**
   * Quando `true`, o hóspede acede ao painel completo antes do horário de check-in.
   * Por omissão (`false`), fica na página de aguardar check-in até à hora da Stays.
   */
  earlyCheckInAccess: boolean
  /**
   * Visibilidade por campo personalizado Stays (`id` do campo como string).
   * Ausente ou vazio: o hóspede vê todos os campos devolvidos pela API.
   */
  customFieldVisibility: Record<string, boolean> | null
  createdAt: Date | null
  updatedAt: Date | null
  /** Último login do hóspede com este código (quando o vínculo existe e o registo é atualizado). */
  lastAccessAt?: Date | null
  /** Resumo do dispositivo/navegador na última sessão. */
  deviceInfo?: string | null
  /** Número de logins registados (incremento no Firestore). */
  accessCount?: number
}
