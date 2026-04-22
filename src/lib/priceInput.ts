/** Converte input tipo "150,00" ou "150.50" em centavos. */
export function parseBrlToCents(value: string): number {
  const s = value.trim().replace(/\s/g, '')
  if (!s) return 0
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = parseFloat(normalized)
  if (Number.isNaN(n) || n < 0) return 0
  return Math.round(n * 100)
}

export function formatCentsToBrlInput(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) return ''
  return (cents / 100).toFixed(2)
}
