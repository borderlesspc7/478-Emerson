import { FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { adminDb } from './firebaseAdmin.js'

export const FCM_TOKENS_COLLECTION = 'fcmTokens'
export const NOTIFICATIONS_COLLECTION = 'notifications'

export type PushPayload = {
  title: string
  body: string
  type: 'check_in_reminder' | 'check_out_reminder' | 'service_completed'
  dedupeKey: string
  data?: Record<string, string>
  url?: string
}

function normalizeStatus(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

export async function wasNotificationSent(dedupeKey: string): Promise<boolean> {
  const db = adminDb()
  const snap = await db
    .collection(NOTIFICATIONS_COLLECTION)
    .where('dedupeKey', '==', dedupeKey)
    .limit(1)
    .get()
  return !snap.empty
}

export async function logNotificationAttempt(input: {
  userId: string
  type: PushPayload['type']
  title: string
  body: string
  dedupeKey: string
  status: 'sent' | 'failed'
  fcmMessageId?: string | null
  data?: Record<string, string>
}): Promise<void> {
  const db = adminDb()
  await db.collection(NOTIFICATIONS_COLLECTION).add({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    dedupeKey: input.dedupeKey,
    status: input.status,
    fcmMessageId: input.fcmMessageId ?? null,
    data: input.data ?? null,
    sentAt: FieldValue.serverTimestamp(),
  })
}

export async function loadActiveFcmTokens(userId: string): Promise<string[]> {
  const db = adminDb()
  const snap = await db
    .collection(FCM_TOKENS_COLLECTION)
    .where('userId', '==', userId)
    .where('active', '==', true)
    .get()

  const tokens = snap.docs
    .map((doc) => doc.data().token)
    .filter((token): token is string => typeof token === 'string' && token.length > 0)

  return [...new Set(tokens)]
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: boolean; messageId?: string }> {
  const db = adminDb()
  const userSnap = await db.collection('users').doc(userId).get()
  if (!userSnap.exists) return { sent: false }

  const userData = userSnap.data() ?? {}
  if (userData.pushNotificationsEnabled !== true) return { sent: false }

  if (await wasNotificationSent(payload.dedupeKey)) {
    return { sent: false }
  }

  const tokens = await loadActiveFcmTokens(userId)
  if (tokens.length === 0) {
    await logNotificationAttempt({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      dedupeKey: payload.dedupeKey,
      status: 'failed',
      data: payload.data,
    })
    return { sent: false }
  }

  const messaging = getMessaging()
  const data = {
    type: payload.type,
    url: payload.url ?? '/',
    ...(payload.data ?? {}),
  }

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data,
      webpush: {
        fcmOptions: {
          link: payload.url ?? '/',
        },
      },
    })

    const successCount = response.responses.filter((r) => r.success).length
    const firstSuccess = response.responses.find((r) => r.success)
    const messageId = firstSuccess?.messageId ?? null

    await logNotificationAttempt({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      dedupeKey: payload.dedupeKey,
      status: successCount > 0 ? 'sent' : 'failed',
      fcmMessageId: messageId,
      data: payload.data,
    })

    return { sent: successCount > 0, messageId: messageId ?? undefined }
  } catch (error) {
    console.error('[push] sendPushToUser failed', userId, error)
    await logNotificationAttempt({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      dedupeKey: payload.dedupeKey,
      status: 'failed',
      data: payload.data,
    })
    return { sent: false }
  }
}

export function isCompletedStatus(value: unknown): boolean {
  const status = normalizeStatus(value)
  return status === 'completed' || status === 'concluído' || status === 'concluido'
}

export function hoursUntil(date: Date, now = new Date()): number {
  return (date.getTime() - now.getTime()) / (1000 * 60 * 60)
}

export function isWithinHoursWindow(
  targetHours: number,
  toleranceHours: number,
  actualHours: number,
): boolean {
  return Math.abs(actualHours - targetHours) <= toleranceHours
}
