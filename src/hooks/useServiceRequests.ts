import { startTransition, useEffect, useState } from 'react'
import {
  subscribeServiceRequests,
  subscribeServiceRequestsForAdmin,
} from '../services/serviceRequestsFirestore'
import type { ServiceRequestRecord } from '../types/serviceRequest'

export type UseServiceRequestsResult = {
  requests: ServiceRequestRecord[]
  loading: boolean
  error: string | null
}

/**
 * Hóspede/Admin: o próprio utilizador.
 * `adminView === true`: lista global de pedidos (apenas role admin no ecrã).
 */
export function useServiceRequests(
  uid: string | undefined,
  options?: { adminView?: boolean }
): UseServiceRequestsResult {
  const adminView = options?.adminView === true
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

    if (adminView) {
      const unsub = subscribeServiceRequestsForAdmin(
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
    }

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
  }, [uid, adminView])

  return { requests, loading, error }
}
