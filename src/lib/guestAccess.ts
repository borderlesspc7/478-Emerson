export type GuestAccessWindow = {
  reservationCode: string
  startDate: string
  endDate: string
  createdAt: string
}

type GuestSession = {
  reservationCode: string
}

const ACCESS_WINDOWS_KEY = 'zen_guest_access_windows_v1'
const GUEST_SESSION_KEY = 'zen_guest_session_v1'

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function getGuestAccessWindows(): GuestAccessWindow[] {
  return readJson<GuestAccessWindow[]>(ACCESS_WINDOWS_KEY, [])
}

export function upsertGuestAccessWindow(input: {
  reservationCode: string
  startDate: string
  endDate: string
}): GuestAccessWindow {
  const normalizedCode = input.reservationCode.trim().toUpperCase()
  const windows = getGuestAccessWindows()
  const next: GuestAccessWindow = {
    reservationCode: normalizedCode,
    startDate: input.startDate,
    endDate: input.endDate,
    createdAt: new Date().toISOString(),
  }

  const existingIdx = windows.findIndex((w) => w.reservationCode === normalizedCode)
  if (existingIdx >= 0) {
    windows[existingIdx] = next
  } else {
    windows.unshift(next)
  }

  writeJson(ACCESS_WINDOWS_KEY, windows)
  return next
}

export function findGuestAccessByReservation(reservationCode: string): GuestAccessWindow | null {
  const normalizedCode = reservationCode.trim().toUpperCase()
  return getGuestAccessWindows().find((w) => w.reservationCode === normalizedCode) ?? null
}

export function saveGuestSession(reservationCode: string): void {
  const session: GuestSession = { reservationCode: reservationCode.trim().toUpperCase() }
  writeJson(GUEST_SESSION_KEY, session)
}

export function getGuestSessionReservationCode(): string | null {
  const session = readJson<GuestSession | null>(GUEST_SESSION_KEY, null)
  return session?.reservationCode ?? null
}

export function clearGuestSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(GUEST_SESSION_KEY)
}
