import { mockGuestStay, mockServiceOffers } from '../data/mockGuestStay'
import type { GuestStay, ServiceOffer } from '../types/guestStay'

export const DEV_GUEST_DEMO_CODE = 'DEV-DEMO'
export const DEV_GUEST_DEMO_PRE_CODE = 'DEV-DEMO-PRE'

/** Só em desenvolvimento: login hóspede sem reserva Stays. */
export function isDevGuestDemoInput(raw: string): boolean {
  if (!import.meta.env.DEV) return false
  const s = raw.trim().toLowerCase()
  return s === 'demo' || s === 'dev-demo' || s === 'demo-pre' || s === 'dev-demo-pre'
}

export function isDevGuestDemoPreCheckIn(raw: string): boolean {
  if (!import.meta.env.DEV) return false
  const s = raw.trim().toLowerCase()
  return s === 'demo-pre' || s === 'dev-demo-pre'
}

function toIsoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const offset = '-03:00'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00${offset}`
}

function demoStayWindow(preCheckIn: boolean): { checkInAt: string; checkOutAt: string } {
  const now = new Date()
  const checkIn = new Date(now)
  const checkOut = new Date(now)

  if (preCheckIn) {
    checkIn.setDate(checkIn.getDate() + 2)
    checkIn.setHours(15, 0, 0, 0)
    checkOut.setDate(checkOut.getDate() + 6)
    checkOut.setHours(11, 0, 0, 0)
  } else {
    checkIn.setDate(checkIn.getDate() - 1)
    checkIn.setHours(15, 0, 0, 0)
    checkOut.setDate(checkOut.getDate() + 4)
    checkOut.setHours(11, 0, 0, 0)
  }

  return { checkInAt: toIsoLocal(checkIn), checkOutAt: toIsoLocal(checkOut) }
}

export function buildDevGuestDemoStay(options?: { preCheckIn?: boolean }): GuestStay {
  const { checkInAt, checkOutAt } = demoStayWindow(Boolean(options?.preCheckIn))
  return {
    ...mockGuestStay,
    reservationCode: options?.preCheckIn ? DEV_GUEST_DEMO_PRE_CODE : DEV_GUEST_DEMO_CODE,
    checkInAt,
    checkOutAt,
  }
}

export function resolveDevGuestDemoCode(raw: string): string {
  return isDevGuestDemoPreCheckIn(raw) ? DEV_GUEST_DEMO_PRE_CODE : DEV_GUEST_DEMO_CODE
}

export function devGuestDemoServiceOffers(): ServiceOffer[] {
  return mockServiceOffers
}
