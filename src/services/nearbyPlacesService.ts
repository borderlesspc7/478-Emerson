import type { InterestCategory, InterestKind } from '../data/interestsCuritiba'
import { haversineMeters } from '../lib/geo/haversineMeters'
import type { NearbyPlace, NearbyPlacesResult } from '../types/nearbyPlace'
import { geocodeAddress } from './geocodingService'

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] }
  properties?: {
    osm_id?: number
    osm_type?: string
    name?: string
    city?: string
    street?: string
    housenumber?: string
    state?: string
    country?: string
    osm_value?: string
  }
}

type PhotonResponse = {
  features?: PhotonFeature[]
}

type PlaceKindQuery = {
  kind: InterestKind
  category: InterestCategory
  osmTag: string
  limit: number
}

const KIND_QUERIES: PlaceKindQuery[] = [
  { kind: 'pharmacy', category: 'essential', osmTag: 'amenity:pharmacy', limit: 2 },
  { kind: 'grocery', category: 'essential', osmTag: 'shop:supermarket', limit: 2 },
  { kind: 'park', category: 'leisure', osmTag: 'leisure:park', limit: 2 },
  { kind: 'museum', category: 'leisure', osmTag: 'tourism:museum', limit: 2 },
]

const CACHE_PREFIX = 'zen-nearby-places:'
const CACHE_TTL_MS = 1000 * 60 * 60 * 12

function buildAddressQuery(parts: {
  addressLine?: string | null
  city?: string | null
  postalCode?: string | null
}): string {
  return [parts.addressLine, parts.city, parts.postalCode, 'Brasil']
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ')
}

function buildMapsQuery(props: PhotonFeature['properties'], fallbackName: string): string {
  const streetLine = [props?.street, props?.housenumber].filter(Boolean).join(', ')
  const parts = [props?.name || fallbackName, streetLine, props?.city, props?.state, props?.country]
    .map((p) => p?.trim())
    .filter(Boolean)
  return parts.join(', ')
}

function stablePlaceId(kind: InterestKind, osmType: string | undefined, osmId: number | undefined): string {
  if (osmId != null) return `${kind}-${osmType ?? 'node'}-${osmId}`
  return `${kind}-unknown-${Math.random().toString(36).slice(2, 9)}`
}

async function fetchPhotonPlaces(
  osmTag: string,
  lat: number,
  lon: number,
  limit: number,
): Promise<PhotonFeature[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('osm_tag', osmTag)
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lon))
  url.searchParams.set('limit', String(Math.max(limit * 2, 6)))

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error('photon/http-error')
  }

  const data = (await res.json()) as PhotonResponse
  return data.features ?? []
}

function mapPhotonToPlace(
  feature: PhotonFeature,
  query: PlaceKindQuery,
  originLat: number,
  originLon: number,
  kindDescription: string,
): NearbyPlace | null {
  const coords = feature.geometry?.coordinates
  if (!coords || coords.length < 2) return null
  const [lon, lat] = coords
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  const props = feature.properties
  const name = props?.name?.trim()
  if (!name) return null

  const distanceMeters = haversineMeters(originLat, originLon, lat, lon)

  return {
    id: stablePlaceId(query.kind, props?.osm_type, props?.osm_id),
    category: query.category,
    kind: query.kind,
    name,
    description: kindDescription,
    distanceMeters,
    mapsQuery: buildMapsQuery(props, name),
  }
}

function readCache(key: string): NearbyPlacesResult | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at: number; data: NearbyPlacesResult }
    if (Date.now() - parsed.at > CACHE_TTL_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function writeCache(key: string, data: NearbyPlacesResult): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }))
  } catch {
    /* quota / private mode */
  }
}

export type FetchNearbyPlacesInput = {
  addressLine?: string | null
  city?: string | null
  postalCode?: string | null
  kindDescriptions: Record<InterestKind, string>
}

/**
 * Pontos de interesse próximos via OpenStreetMap (Photon) após geocodificar o imóvel (Open-Meteo).
 */
export async function fetchNearbyPlacesForProperty(
  input: FetchNearbyPlacesInput,
): Promise<NearbyPlacesResult> {
  const addressQuery = buildAddressQuery(input)
  if (!addressQuery) {
    throw new Error('nearby/missing-address')
  }

  const cacheKey = `${CACHE_PREFIX}${addressQuery.toLowerCase()}`
  const cached = readCache(cacheKey)
  if (cached) return cached

  const geocoded = await geocodeAddress(addressQuery)
  if (!geocoded) {
    throw new Error('nearby/geocode-not-found')
  }

  const places: NearbyPlace[] = []

  for (const query of KIND_QUERIES) {
    const features = await fetchPhotonPlaces(
      query.osmTag,
      geocoded.lat,
      geocoded.lon,
      query.limit,
    )

    const mapped = features
      .map((f) =>
        mapPhotonToPlace(
          f,
          query,
          geocoded.lat,
          geocoded.lon,
          input.kindDescriptions[query.kind],
        ),
      )
      .filter((p): p is NearbyPlace => p !== null)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)

    const uniqueByName = new Map<string, NearbyPlace>()
    for (const place of mapped) {
      const key = place.name.toLowerCase()
      if (!uniqueByName.has(key)) {
        uniqueByName.set(key, place)
      }
    }

    places.push(...[...uniqueByName.values()].slice(0, query.limit))
  }

  if (places.length === 0) {
    throw new Error('nearby/no-results')
  }

  const result: NearbyPlacesResult = {
    places,
    regionLabel: geocoded.label,
    source: 'openstreetmap',
    originLat: geocoded.lat,
    originLon: geocoded.lon,
  }

  writeCache(cacheKey, result)
  return result
}
