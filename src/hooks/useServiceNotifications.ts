import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../contexts/ToastContext'
import {
  loadReadIdsSetForUser,
  mergeReadIdsForUser,
} from '../lib/serviceNotificationReadState'
import { subscribeServiceRequests } from '../services/serviceRequestsFirestore'
import type {
  ServiceRequestRecord,
  ServiceRequestStatus,
} from '../types/serviceRequest'

export type GuestServiceNotificationItem = {
  id: string
  serviceName: string
  completedAt: Date | null
  read: boolean
}

export type UseServiceNotificationsResult = {
  /** Pedidos concluídos (mais recentes primeiro) com estado lido/não lido. */
  completedItems: GuestServiceNotificationItem[]
  unreadCount: number
  markAllAsRead: () => void
}

/**
 * Monitoriza `serviceRequests` do hóspede (Firestore `onSnapshot` via `subscribeServiceRequests`).
 * Em transição para `completed`, mostra toast de sucesso. Estado “lido” em `localStorage`.
 */
export function useServiceNotifications(
  uid: string | undefined,
  options?: { enabled?: boolean },
): UseServiceNotificationsResult {
  const enabled = options?.enabled !== false && Boolean(uid)
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [requests, setRequests] = useState<ServiceRequestRecord[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const prevStatusRef = useRef<Map<string, ServiceRequestStatus>>(new Map())
  const seededRef = useRef(false)

  useEffect(() => {
    if (!uid || !enabled) {
      setReadIds(new Set())
      return
    }
    setReadIds(loadReadIdsSetForUser(uid))
  }, [uid, enabled])

  useEffect(() => {
    if (!uid || !enabled) {
      setRequests([])
      prevStatusRef.current = new Map()
      seededRef.current = false
      return
    }

    seededRef.current = false
    prevStatusRef.current = new Map()

    const unsub = subscribeServiceRequests(
      uid,
      (items) => {
        setRequests(items)

        if (!seededRef.current) {
          seededRef.current = true
          prevStatusRef.current = new Map(items.map((i) => [i.id, i.status]))
          return
        }

        for (const item of items) {
          const prev = prevStatusRef.current.get(item.id)
          if (
            item.status === 'completed' &&
            prev !== undefined &&
            prev !== 'completed'
          ) {
            const name =
              (item.serviceName && item.serviceName.trim()) ||
              t('guestNotifications.unknownService')
            showToast(
              t('guestNotifications.toastCompleted', { serviceName: name }),
              'success',
            )
          }
        }
        prevStatusRef.current = new Map(items.map((i) => [i.id, i.status]))
      },
      () => {
        setRequests([])
      },
    )

    return unsub
  }, [uid, enabled, showToast, t])

  const markAllAsRead = useCallback(() => {
    if (!uid) return
    const completedIds = requests
      .filter((r) => r.status === 'completed')
      .map((r) => r.id)
    if (completedIds.length === 0) return
    mergeReadIdsForUser(uid, completedIds)
    setReadIds(loadReadIdsSetForUser(uid))
  }, [uid, requests])

  const completedItems = useMemo((): GuestServiceNotificationItem[] => {
    return requests
      .filter((r) => r.status === 'completed')
      .sort((a, b) => {
        const tb = b.completedAt?.getTime() ?? b.updatedAt?.getTime() ?? 0
        const ta = a.completedAt?.getTime() ?? a.updatedAt?.getTime() ?? 0
        return tb - ta
      })
      .map((r) => ({
        id: r.id,
        serviceName:
          (r.serviceName && r.serviceName.trim()) ||
          t('guestNotifications.unknownService'),
        completedAt: r.completedAt ?? r.updatedAt,
        read: readIds.has(r.id),
      }))
  }, [requests, readIds, t])

  const unreadCount = useMemo(
    () => completedItems.filter((i) => !i.read).length,
    [completedItems],
  )

  return { completedItems, unreadCount, markAllAsRead }
}
