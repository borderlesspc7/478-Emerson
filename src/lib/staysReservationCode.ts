import type { StaysBooking } from '../types/staysApi'

/**
 * Código apresentado ao hóspede: prioriza o identificador da OTA (`partnerCode`).
 * Reservas internas não têm esse campo e continuam a usar o ID curto da Stays.
 */
export function resolveGuestReservationCode(
  booking: StaysBooking,
  fallbackCode = '',
): string {
  return (
    booking.partnerCode?.trim() ||
    booking.id?.trim() ||
    fallbackCode.trim() ||
    booking._id?.trim() ||
    ''
  )
}

/** Remove o prefixo técnico usado pela Stays e uniformiza portais conhecidos. */
export function resolveBookingPortalName(booking: StaysBooking): string | null {
  const rawName = booking.partner?.name?.trim()
  if (!rawName) return null

  const name = rawName.replace(/^API\s+/i, '').trim()
  if (!name) return null

  const knownNames: Record<string, string> = {
    'booking.com': 'Booking.com',
    booking: 'Booking.com',
    airbnb: 'Airbnb',
  }
  return knownNames[name.toLowerCase()] ?? name
}
