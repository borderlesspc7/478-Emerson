/**
 * O painel Stays usa URLs como:
 * `https://{tenant}/i/account-overview/…?reserve=IU08J` — o identificador da
 * reserva no sentido do login é o query param `reserve` (código curto), não o
 * id no path (muitas vezes de listing/conta, não o id de reserva na API).
 * A app chama a API REST: `GET …/external/v1/booking/reservations/{id}`.
 */
export function parseStaysReservationUserInput(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s)
      const r = u.searchParams.get('reserve') ?? u.searchParams.get('Reserve')
      if (r?.trim()) return r.trim()
    } catch {
      // não é URL válida; tratar como código manual
    }
  }
  return s
}
