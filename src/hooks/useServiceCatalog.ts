import { startTransition, useEffect, useState } from 'react'
import { subscribeServiceCatalog } from '../services/serviceCatalogFirestore'
import type { ServiceCatalogItem } from '../types/serviceCatalog'

export type UseServiceCatalogResult = {
  items: ServiceCatalogItem[]
  ready: boolean
  error: string | null
}

export function useServiceCatalog(): UseServiceCatalogResult {
  const [items, setItems] = useState<ServiceCatalogItem[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeServiceCatalog(
      (list) => {
        startTransition(() => {
          setItems(list)
          setReady(true)
          setError(null)
        })
      },
      () => {
        startTransition(() => {
          setItems([])
          setReady(true)
          setError('firestore/listen-failed')
        })
      }
    )
    return unsub
  }, [])

  return { items, ready, error }
}
