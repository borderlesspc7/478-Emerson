/** Mantém só dígitos (DDI + número), até 15 caracteres — formato aceite pelo `wa.me`. */
export function normalizeWhatsappDigits(input: string): string {
  return input.replace(/\D/g, '').slice(0, 15)
}

/**
 * Abre conversa no WhatsApp com número opcional (ex.: 5511999998888).
 * Sem número válido (≥10 dígitos), usa `wa.me` só com o texto pré-preenchido.
 */
export function buildWhatsappRequestUrl(
  phoneDigits: string | null | undefined,
  message: string
): string {
  const encoded = encodeURIComponent(message)
  const digits = normalizeWhatsappDigits(phoneDigits ?? '')
  if (digits.length >= 10) {
    return `https://wa.me/${digits}?text=${encoded}`
  }
  return `https://wa.me/?text=${encoded}`
}
