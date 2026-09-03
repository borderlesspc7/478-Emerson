import { mockGuestStay, mockServiceOffers } from '../data/mockGuestStay'
import type { GuestStay, ServiceOffer } from '../types/guestStay'

export const DEV_GUEST_DEMO_CODE = 'DEV-DEMO'

/** Só em desenvolvimento: login hóspede sem reserva Stays (digite `demo`). */
export function isDevGuestDemoInput(raw: string): boolean {
  if (!import.meta.env.DEV) return false
  const s = raw.trim().toLowerCase()
  return s === 'demo' || s === 'dev-demo'
}

function demoStayWindow(): { checkInAt: string; checkOutAt: string } {
  const now = new Date()
  const checkIn = new Date(now)
  checkIn.setDate(checkIn.getDate() - 1)
  checkIn.setHours(15, 0, 0, 0)
  const checkOut = new Date(now)
  checkOut.setDate(checkOut.getDate() + 4)
  checkOut.setHours(11, 0, 0, 0)
  const offset = '-03:00'
  const toIso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${offset}`
  }
  return { checkInAt: toIso(checkIn), checkOutAt: toIso(checkOut) }
}

export function buildDevGuestDemoStay(): GuestStay {
  const { checkInAt, checkOutAt } = demoStayWindow()
  return {
    ...mockGuestStay,
    checkInAt,
    checkOutAt,
  }
}

export function devGuestDemoServiceOffers(): ServiceOffer[] {
  return mockServiceOffers
}
