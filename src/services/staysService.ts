import type { ServiceOffer } from '../types/guestStay'
import type {
  StaysBooking,
  StaysExtraService,
  StaysHouseRules,
  StaysPropertyListing,
} from '../types/staysApi'
import type { AxiosInstance } from 'axios'
import { getStaysAxios, StaysApiError, withStaysRetry } from './staysClient'
import {
  mapStaysToGuestStayBundle,
  serviceOffersForGuest,
  type StaysGuestStayBundle,
} from './staysMapper'
const CACHE_TTL_MS = 60_000

const cache = new Map<string, { expiresAt: number; value: unknown }>()

function requireStaysAxios(): AxiosInstance {
  const instance = getStaysAxios()
  if (!instance) {
    throw new StaysApiError(
      'Integração Stays não configurada. Defina VITE_STAYS_BASE_URL, VITE_STAYS_LOGIN e VITE_STAYS_PASSWORD.',
      undefined,
      'stays/not-configured'
    )
  }
  return instance
}

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value as T
  }
  const value = await fetcher()
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value })
  return value
}

function segment(pathSegment: string): string {
  return encodeURIComponent(pathSegment)
}

/**
 * GET /external/v1/booking/reservations/{reservationId}
 * Documentação: short/long id ou partnerCode.
 */
export async function fetchReservation(reservationCode: string): Promise<StaysBooking> {
  const client = requireStaysAxios()
  const path = `booking/reservations/${segment(reservationCode)}`
  return cached(`GET:${path}`, () => withStaysRetry(() => client.get<StaysBooking>(path).then((r) => r.data)))
}

/**
 * GET /external/v1/content/listings/{listingId}
 */
export async function fetchListingById(listingId: string): Promise<StaysPropertyListing> {
  const client = requireStaysAxios()
  const path = `content/listings/${segment(listingId)}`
  return cached(`GET:${path}`, () =>
    withStaysRetry(() => client.get<StaysPropertyListing>(path).then((r) => r.data))
  )
}

/**
 * GET /external/v1/settings/listing/{listingId}/house-rules
 */
export async function fetchListingHouseRules(listingId: string): Promise<StaysHouseRules> {
  const client = requireStaysAxios()
  const path = `settings/listing/${segment(listingId)}/house-rules`
  return cached(`GET:${path}`, () =>
    withStaysRetry(() => client.get<StaysHouseRules>(path).then((r) => r.data))
  )
}

/**
 * GET /external/v1/booking/reservations/{reservationId}/extra-services
 */
export async function fetchReservationExtraServices(
  reservationCode: string
): Promise<StaysExtraService[]> {
  const client = requireStaysAxios()
  const path = `booking/reservations/${segment(reservationCode)}/extra-services`
  return cached(`GET:${path}`, () =>
    withStaysRetry(() => client.get<StaysExtraService[]>(path).then((r) => r.data))
  )
}

export type StaysGuestProfile = StaysGuestStayBundle & {
  serviceOffers: ServiceOffer[]
}

/**
 * Agrega reserva + imóvel (listing) + regras + extras para o modelo do app.
 * Usa o id curto do listing nas rotas de conteúdo/configurações quando disponível.
 */
export async function fetchGuestProfileFromStays(
  reservationCode: string
): Promise<StaysGuestProfile> {
  const normalized = reservationCode.trim().toUpperCase()
  const booking = await fetchReservation(normalized)

  if (booking.type === 'canceled') {
    throw new StaysApiError('Esta reserva está cancelada na Stays.', undefined, 'stays/reservation-canceled')
  }

  const listingRef = booking._idlisting
  let listing: StaysPropertyListing | null = null
  let houseRules: StaysHouseRules | null = null

  if (listingRef) {
    try {
      listing = await fetchListingById(listingRef)
      const listingRouteId = listing.id?.trim() || listingRef
      try {
        houseRules = await fetchListingHouseRules(listingRouteId)
      } catch {
        houseRules = null
      }
    } catch {
      listing = null
    }
  }

  let extras: StaysExtraService[] = []
  try {
    extras = await fetchReservationExtraServices(normalized)
  } catch {
    extras = []
  }

  const bundle = mapStaysToGuestStayBundle(normalized, booking, listing, houseRules)

  return {
    ...bundle,
    serviceOffers: serviceOffersForGuest(extras),
  }
}

export function isStaysApiConfigured(): boolean {
  return getStaysAxios() != null
}
