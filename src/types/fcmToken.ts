import type { Timestamp } from 'firebase/firestore'

export type FcmTokenRecord = {
  userId: string
  token: string
  platform: 'web'
  userAgent: string | null
  active: boolean
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}
