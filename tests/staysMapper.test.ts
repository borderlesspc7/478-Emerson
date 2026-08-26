import { describe, expect, it } from 'vitest'
import { toStayCheckOutIso, toStayIso } from '../src/services/staysMapper'

describe('Stays date mapping', () => {
  it('preserves Stays date and time with the project timezone', () => {
    expect(toStayIso('2026-08-24', '15:30')).toBe(
      '2026-08-24T15:30:00-03:00',
    )
    expect(toStayCheckOutIso('2026-08-27', '10:45')).toBe(
      '2026-08-27T10:45:00-03:00',
    )
  })

  it('uses documented project defaults when Stays omits a time', () => {
    expect(toStayIso('2026-08-24')).toBe('2026-08-24T15:00:00-03:00')
    expect(toStayCheckOutIso('2026-08-27')).toBe(
      '2026-08-27T11:00:00-03:00',
    )
  })
})
