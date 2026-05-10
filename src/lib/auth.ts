type StayWindow = {
  checkInAt?: string | Date | null
  checkOutAt?: string | Date | null
}

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

/**
 * Regra base de sessão temporária:
 * início flexível no dia do check-in (00:00 local); fim rigoroso na data/hora de check-out da Stays.
 */
export function isStayAccessActive(stay: StayWindow, now = new Date()): boolean {
  const checkIn = toDate(stay.checkInAt)
  const checkOut = toDate(stay.checkOutAt)
  if (!checkIn || !checkOut) return true
  const windowStart = startOfLocalDay(checkIn)
  return now >= windowStart && now <= checkOut
}
