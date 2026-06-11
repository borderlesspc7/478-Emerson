import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CURITIBA_INTERESTS, type InterestKind } from '../data/interestsCuritiba'
import { useGuestStay } from './useGuestStay'
import { fetchNearbyPlacesForProperty } from '../services/nearbyPlacesService'
import type { NearbyPlace } from '../types/nearbyPlace'

export type UseNearbyInterestsResult = {
  essential: NearbyPlace[]
  leisure: NearbyPlace[]
  regionLabel: string
  loading: boolean
  error: string | null
  source: 'openstreetmap' | 'fallback' | null
}

function buildFallbackPlaces(
  t: (key: string) => string,
  prefix: string,
): NearbyPlace[] {
  return CURITIBA_INTERESTS.map((item) => ({
    id: item.id,
    category: item.category,
    kind: item.kind,
    name: t(`${prefix}.${item.id}.name`),
    description: t(`${prefix}.${item.id}.description`),
    distanceMeters: Number.NaN,
    mapsQuery: item.mapsQuery,
  }))
}

export function useNearbyInterests(): UseNearbyInterestsResult {
  const { t } = useTranslation()
  const { stay } = useGuestStay()
  const [places, setPlaces] = useState<NearbyPlace[]>([])
  const [regionLabel, setRegionLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'openstreetmap' | 'fallback' | null>(null)

  const kindDescriptions = useMemo(
    (): Record<InterestKind, string> => ({
      pharmacy: t('interests.kindDescriptions.pharmacy'),
      grocery: t('interests.kindDescriptions.grocery'),
      park: t('interests.kindDescriptions.park'),
      museum: t('interests.kindDescriptions.museum'),
    }),
    [t],
  )

  const property = stay.property
  const addressKey = [property.addressLine, property.city, property.postalCode]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join('|')

  useEffect(() => {
    let cancelled = false

    async function run() {
      setLoading(true)
      setError(null)

      try {
        const result = await fetchNearbyPlacesForProperty({
          addressLine: property.addressLine,
          city: property.city,
          postalCode: property.postalCode,
          kindDescriptions,
        })
        if (cancelled) return
        setPlaces(result.places)
        setRegionLabel(result.regionLabel)
        setSource(result.source)
      } catch {
        if (cancelled) return
        const fallback = buildFallbackPlaces(t, 'interests.items')
        setPlaces(fallback)
        setRegionLabel(property.city?.trim() || 'Curitiba')
        setSource('fallback')
        setError('interests.errorFallback')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [addressKey, kindDescriptions, property.addressLine, property.city, property.postalCode, t])

  const essential = useMemo(
    () => places.filter((p) => p.category === 'essential'),
    [places],
  )
  const leisure = useMemo(
    () => places.filter((p) => p.category === 'leisure'),
    [places],
  )

  return {
    essential,
    leisure,
    regionLabel,
    loading,
    error,
    source,
  }
}
