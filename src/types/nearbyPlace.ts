import type { InterestCategory, InterestKind } from '../data/interestsCuritiba'

export type NearbyPlace = {
  id: string
  category: InterestCategory
  kind: InterestKind
  name: string
  description: string
  distanceMeters: number
  mapsQuery: string
}

export type NearbyPlacesResult = {
  places: NearbyPlace[]
  regionLabel: string
  source: 'openstreetmap' | 'fallback'
  originLat: number | null
  originLon: number | null
}
