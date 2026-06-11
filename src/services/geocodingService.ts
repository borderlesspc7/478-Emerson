export type GeocodedLocation = {
  lat: number
  lon: number
  label: string
}

type OpenMeteoGeocodeResponse = {
  results?: Array<{
    latitude?: number
    longitude?: number
    name?: string
    admin1?: string
    country?: string
  }>
}

/**
 * Geocodificação gratuita (Open-Meteo) — sem API key, CORS aberto.
 * @see https://open-meteo.com/en/docs/geocoding-api
 */
export async function geocodeAddress(query: string): Promise<GeocodedLocation | null> {
  const q = query.trim()
  if (!q) return null

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', q)
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'pt')
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error('geocoding/http-error')
  }

  const data = (await res.json()) as OpenMeteoGeocodeResponse
  const hit = data.results?.[0]
  const lat = hit?.latitude
  const lon = hit?.longitude
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null
  }

  const labelParts = [hit?.name, hit?.admin1, hit?.country].filter(Boolean)
  return {
    lat,
    lon,
    label: labelParts.join(', ') || q,
  }
}
