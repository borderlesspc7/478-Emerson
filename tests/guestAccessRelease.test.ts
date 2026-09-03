import { describe, expect, it } from 'vitest'
import {
  normalizeAccessReleaseTime,
  resolveAccessReleaseAt,
} from '../src/lib/guestAccessRelease'

describe('guest access release time', () => {
  it('changes only the time and preserves the Stays date and timezone', () => {
    expect(
      resolveAccessReleaseAt('2026-09-02T15:00:00-03:00', '13:30'),
    ).toBe('2026-09-02T13:30:00-03:00')
  })

  it('uses the original check-in when no custom time is configured', () => {
    expect(resolveAccessReleaseAt('2026-09-02T15:00:00-03:00', null)).toBe(
      '2026-09-02T15:00:00-03:00',
    )
  })

  it('rejects invalid admin values', () => {
    expect(normalizeAccessReleaseTime('24:00')).toBeNull()
    expect(normalizeAccessReleaseTime('9:30')).toBeNull()
    expect(normalizeAccessReleaseTime('09:30')).toBe('09:30')
  })
})
