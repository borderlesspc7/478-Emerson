import type { GuestStay } from '../types/guestStay'

/** Foto principal do imóvel para o hóspede (capa Stays ou primeira foto curada). */
export function pickGuestPropertyImageUrl(stay: GuestStay): string | null {
  const fromListing = stay.property.imageUrl?.trim()
  if (fromListing) return fromListing
  const fromGarage = stay.zenCurated?.garageImageUrls.find((url) => url.trim())
  if (fromGarage?.trim()) return fromGarage.trim()
  const fromElevator = stay.zenCurated?.elevatorImageUrls.find((url) => url.trim())
  if (fromElevator?.trim()) return fromElevator.trim()
  return null
}
