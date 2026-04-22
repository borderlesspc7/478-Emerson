import type { TFunction } from 'i18next'
import type { GuestStay } from '../types/guestStay'

export function formatPartyLine(
  party: NonNullable<GuestStay['party']>,
  t: TFunction
): string {
  const parts: string[] = []
  if (party.adults > 0) parts.push(t('reservation.partyAdults', { count: party.adults }))
  if (party.children > 0) parts.push(t('reservation.partyChildren', { count: party.children }))
  if (party.infants > 0) parts.push(t('reservation.partyInfants', { count: party.infants }))
  return parts.join(' · ')
}

export function formatTotalPrice(
  p: NonNullable<GuestStay['totalPrice']>,
  locale: string
): string {
  const loc = locale === 'en' || locale.startsWith('en') ? 'en-US' : 'pt-BR'
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: p.currency,
    }).format(p.amount)
  } catch {
    return `${p.amount} ${p.currency}`
  }
}
