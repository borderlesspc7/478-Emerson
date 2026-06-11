/** Etiqueta legível para distância a pé / deslocação curta. */
export function formatDistanceLabel(meters: number, locale: string): string {
  if (!Number.isFinite(meters) || meters < 0) return '—'
  const loc = locale === 'en' ? 'en' : 'pt-BR'
  if (meters < 1000) {
    const rounded = Math.max(50, Math.round(meters / 50) * 50)
    return new Intl.NumberFormat(loc, {
      style: 'unit',
      unit: 'meter',
      unitDisplay: 'short',
      maximumFractionDigits: 0,
    }).format(rounded)
  }
  const km = meters / 1000
  return new Intl.NumberFormat(loc, {
    style: 'unit',
    unit: 'kilometer',
    unitDisplay: 'short',
    maximumFractionDigits: km < 10 ? 1 : 0,
  }).format(km)
}
