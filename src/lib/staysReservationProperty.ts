import type { StaysPropertyListing } from '../types/staysApi'

export type PropertyLookupOption = {
  propertyId: string
  title: string
  shortCode: string | null
}

function localizedTitle(listing: StaysPropertyListing): string {
  const titles = listing._mstitle
  return (
    titles?.pt_BR ||
    titles?.pt_PT ||
    titles?.en_US ||
    (titles ? Object.values(titles).find((value) => value?.trim()) : '') ||
    listing.internalName ||
    listing.id ||
    listing._id ||
    'Imóvel Stays'
  )
}

export type ResolvedReservationProperty = {
  propertyId: string
  summary: string
}

/** Reutiliza a opção já carregada pelo painel ou monta um resumo com o payload da API. */
export function resolveReservationPropertyDisplay(
  listingIdFromReservation: string,
  listing: StaysPropertyListing,
  options: readonly PropertyLookupOption[],
): ResolvedReservationProperty {
  const candidates = new Set(
    [listingIdFromReservation, listing._id, listing.id]
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value)),
  )
  const option = options.find(
    (item) =>
      candidates.has(item.propertyId.trim().toLowerCase()) ||
      candidates.has(item.shortCode?.trim().toLowerCase() ?? ''),
  )

  if (option) {
    const codePart = option.shortCode
      ? `${option.shortCode} · ${option.propertyId}`
      : option.propertyId
    return {
      propertyId: option.propertyId,
      summary: `${option.title} (${codePart})`,
    }
  }

  const propertyId = listing._id?.trim() || listingIdFromReservation.trim()
  const shortCode = listing.id?.trim()
  const codePart = shortCode ? `${shortCode} · ${propertyId}` : propertyId
  return {
    propertyId,
    summary: `${localizedTitle(listing)} (${codePart})`,
  }
}
