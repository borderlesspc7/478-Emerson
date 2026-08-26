import { describe, expect, it } from 'vitest'
import {
  getStayAccessState,
  isGuestPreCheckInLocked,
  isStayAccessActive,
  isStayCheckOutExpired,
} from '../src/lib/auth'

const stay = {
  checkInAt: '2026-08-24T15:00:00-03:00',
  checkOutAt: '2026-08-27T11:00:00-03:00',
}

describe('stay access window', () => {
  it('uses inclusive check-in and check-out boundaries', () => {
    const atCheckIn = new Date('2026-08-24T18:00:00.000Z')
    const atCheckOut = new Date('2026-08-27T14:00:00.000Z')
    expect(getStayAccessState(stay, atCheckIn)).toBe('active')
    expect(getStayAccessState(stay, atCheckOut)).toBe('active')
    expect(isStayAccessActive(stay, atCheckOut)).toBe(true)
    expect(isStayCheckOutExpired(stay, atCheckOut)).toBe(false)
  })

  it('locks before check-in unless early access was granted', () => {
    const before = new Date('2026-08-24T17:59:59.999Z')
    expect(getStayAccessState(stay, before)).toBe('pre-check-in')
    expect(isGuestPreCheckInLocked(stay, {}, before)).toBe(true)
    expect(
      isGuestPreCheckInLocked(stay, { earlyCheckInAccess: true }, before),
    ).toBe(false)
  })

  it('expires immediately after check-out', () => {
    const after = new Date('2026-08-27T14:00:00.001Z')
    expect(getStayAccessState(stay, after)).toBe('expired')
    expect(isStayCheckOutExpired(stay, after)).toBe(true)
  })

  it('fails closed for missing, invalid, or inverted windows', () => {
    expect(getStayAccessState({}, new Date())).toBe('invalid')
    expect(
      getStayAccessState({ checkInAt: 'invalid', checkOutAt: stay.checkOutAt }),
    ).toBe('invalid')
    expect(
      getStayAccessState({
        checkInAt: '2026-08-28T15:00:00-03:00',
        checkOutAt: '2026-08-27T11:00:00-03:00',
      }),
    ).toBe('invalid')
    expect(isStayAccessActive({})).toBe(false)
  })

  it('does not lock pre-check-in when the stay window is incomplete', () => {
    const now = new Date('2026-08-20T12:00:00.000Z')
    expect(isGuestPreCheckInLocked({}, {}, now)).toBe(false)
    expect(
      isGuestPreCheckInLocked({ checkInAt: 'not-a-date' }, {}, now),
    ).toBe(false)
    expect(isStayCheckOutExpired({ checkOutAt: null }, now)).toBe(false)
  })
})
