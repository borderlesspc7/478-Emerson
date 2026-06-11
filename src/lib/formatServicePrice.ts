export function formatServicePrice(locale: string, valueInCents: number): string {
  const loc = locale === 'en' ? 'en-US' : 'pt-BR'
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(valueInCents / 100)
}
