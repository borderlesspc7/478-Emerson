import { onSchedule } from 'firebase-functions/v2/scheduler'
import { adminDb } from '../lib/firebaseAdmin.js'
import { buildDailyAnalyticsSnapshot, yesterdayDateKey } from '../lib/analyticsAggregator.js'

export const generateDailyAnalytics = onSchedule(
  {
    schedule: '0 2 * * *',
    region: 'southamerica-east1',
    timeZone: 'America/Sao_Paulo',
  },
  async () => {
    const db = adminDb()
    const dateKey = yesterdayDateKey()
    const snapshot = await buildDailyAnalyticsSnapshot(db, dateKey)
    await db.collection('analyticsSnapshots').doc(dateKey).set(snapshot, { merge: true })
    console.info(`[analytics] Snapshot saved for ${dateKey}`)
  },
)
