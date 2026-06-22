import { onSchedule } from 'firebase-functions/v2/scheduler'
import { Timestamp } from 'firebase-admin/firestore'
import {
  hoursUntil,
  isWithinHoursWindow,
  sendPushToUser,
} from '../lib/pushMessaging.js'
import { adminDb } from '../lib/firebaseAdmin.js'

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  return null
}

function formatStayDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const sendStayReminderPushes = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
  },
  async () => {
    const db = adminDb()
    const now = new Date()
    const guestsSnap = await db.collection('users').where('role', '==', 'guest').get()

    for (const guestDoc of guestsSnap.docs) {
      const data = guestDoc.data()
      if (data.pushNotificationsEnabled !== true) continue

      const userId = guestDoc.id
      const checkInAt = toDate(data.checkInAt)
      const checkOutAt = toDate(data.checkOutAt)
      const propertyName =
        typeof data.propertyName === 'string' && data.propertyName.trim()
          ? data.propertyName.trim()
          : 'sua estadia'

      if (checkInAt && checkInAt.getTime() > now.getTime()) {
        const hoursToCheckIn = hoursUntil(checkInAt, now)
        if (isWithinHoursWindow(24, 1, hoursToCheckIn)) {
          const dedupeKey = `check_in_${userId}_${checkInAt.toISOString().slice(0, 10)}`
          await sendPushToUser(userId, {
            type: 'check_in_reminder',
            title: 'Check-in amanhã',
            body: `Seu check-in em ${propertyName} é amanhã (${formatStayDate(checkInAt)}).`,
            dedupeKey,
            data: {
              checkInAt: checkInAt.toISOString(),
            },
            url: '/',
          })
        }
      }

      if (checkOutAt && checkOutAt.getTime() > now.getTime()) {
        const hoursToCheckOut = hoursUntil(checkOutAt, now)
        if (isWithinHoursWindow(2, 0.5, hoursToCheckOut)) {
          const dedupeKey = `check_out_${userId}_${checkOutAt.toISOString().slice(0, 13)}`
          await sendPushToUser(userId, {
            type: 'check_out_reminder',
            title: 'Checkout em breve',
            body: `Seu checkout em ${propertyName} é em cerca de 2 horas (${formatStayDate(checkOutAt)}).`,
            dedupeKey,
            data: {
              checkOutAt: checkOutAt.toISOString(),
            },
            url: '/reserva',
          })
        }
      }
    }
  },
)
