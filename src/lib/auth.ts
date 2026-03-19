type StayWindow = {
  checkInAt?: string | Date | null
  checkOutAt?: string | Date | null
}

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Regra base de sessão temporária:
 * o acesso só é válido dentro do período da estadia.
 */
export function isStayAccessActive(stay: StayWindow, now = new Date()): boolean {
  const checkIn = toDate(stay.checkInAt)
  const checkOut = toDate(stay.checkOutAt)
  if (!checkIn || !checkOut) return true
  return now >= checkIn && now <= checkOut
}
