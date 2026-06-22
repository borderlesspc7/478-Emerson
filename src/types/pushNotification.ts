import type { Timestamp } from 'firebase/firestore'

export type PushNotificationType =
  | 'check_in_reminder'
  | 'check_out_reminder'
  | 'service_completed'

export type PushNotificationLogRecord = {
  userId: string
  type: PushNotificationType
  title: string
  body: string
  dedupeKey: string
  status: 'sent' | 'failed'
  fcmMessageId: string | null
  data: Record<string, string> | null
  sentAt: Timestamp | null
}
