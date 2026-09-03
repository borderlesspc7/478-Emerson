import { describe, expect, it } from 'vitest'
import { parseStaysReservationUserInput } from '../src/lib/staysReservationInput'

describe('parseStaysReservationUserInput', () => {
  it('returns trimmed plain reservation code', () => {
    expect(parseStaysReservationUserInput('  IZ07J  ')).toBe('IZ07J')
  })

  it('extracts reserve param from Stays URL', () => {
    expect(
      parseStaysReservationUserInput(
        'https://tenant.stays.net/i/account-overview/abc?reserve=IU08J',
      ),
    ).toBe('IU08J')
  })

  it('supports Reserve param with capital R', () => {
    expect(
      parseStaysReservationUserInput('https://example.com/book?Reserve=LQ05J'),
    ).toBe('LQ05J')
  })

  it('falls back to raw input when URL has no reserve param', () => {
    expect(parseStaysReservationUserInput('https://example.com/book')).toBe(
      'https://example.com/book',
    )
  })

  it('returns empty string for blank input', () => {
    expect(parseStaysReservationUserInput('   ')).toBe('')
  })
})
