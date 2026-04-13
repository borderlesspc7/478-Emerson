import { startTransition, useEffect, useState } from 'react'
import { subscribeServiceRequests } from '../services/serviceRequestsFirestore'
import type { ServiceRequestRecord } from '../types/serviceRequest'

export type UseServiceRequestsResult = {
  requests: ServiceRequestRecord[]
  loading: boolean
  error: string | null
}

export function useServiceRequests(uid: string | undefined): UseServiceRequestsResult {
  const [requests, setRequests] = useState<ServiceRequestRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) {
      startTransition(() => {
        setRequests([])
        setLoading(false)
        setError(null)
      })
      return
    }

    startTransition(() => {
      setLoading(true)
      setError(null)
    })

    const unsub = subscribeServiceRequests(
      uid,
      (items) => {
        startTransition(() => {
          setRequests(items)
          setLoading(false)
          setError(null)
        })
      },
      () => {
        startTransition(() => {
          setRequests([])
          setError('firestore/listen-failed')
          setLoading(false)
        })
      }
    )

    return unsub
  }, [uid])

  return { requests, loading, error }
}
