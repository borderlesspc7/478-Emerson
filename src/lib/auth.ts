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

function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/**
 * Regra base de sessão temporária:
 * o acesso só é válido dentro do período da estadia.
 */
export function isStayAccessActive(stay: StayWindow, now = new Date()): boolean {
  const checkIn = toDate(stay.checkInAt)
  const checkOut = toDate(stay.checkOutAt)
  if (!checkIn || !checkOut) return true
  /**
   * A Stays pode devolver horários de check-in/out (ex. 15:00) que não representam
   * “quando o acesso ao painel deve começar”. Para evitar bloqueios indevidos no
   * dia do check-in (antes do horário) e no dia do check-out (após o horário),
   * aplicamos a janela por dia local: [00:00 do check-in, 23:59:59 do check-out].
   */
  const windowStart = startOfLocalDay(checkIn)
  const windowEnd = endOfLocalDay(checkOut)
  return now >= windowStart && now <= windowEnd
}
