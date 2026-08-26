import { describe, expect, it } from 'vitest'
import { StaysApiError } from '../src/services/staysClient'
import {
  parseStaysBookingPayload,
  parseStaysExtraServicesPayload,
  parseStaysHouseRulesPayload,
  requireReservationListingId,
} from '../src/services/staysValidation'

describe('Stays response validation', () => {
  it('accepts the minimum useful reservation contract', () => {
    const booking = parseStaysBookingPayload({
      id: 'IZ07J',
      _idlisting: 'listing-123',
      checkInDate: '2026-08-24',
      checkInTime: '15:00',
      checkOutDate: '2026-08-27',
      checkOutTime: '11:00',
    })

    expect(requireReservationListingId(booking)).toBe('listing-123')
  })

  it('rejects malformed date and numeric fields', () => {
    expect(() =>
      parseStaysBookingPayload({ id: 'IZ07J', checkInDate: '24/08/2026' }),
    ).toThrowError(StaysApiError)
    expect(() =>
      parseStaysBookingPayload({ id: 'IZ07J', guests: '2' }),
    ).toThrow(/guests/)
  })

  it('rejects unidentified reservation payloads', () => {
    expect(() => parseStaysBookingPayload({ _idlisting: 'listing-123' })).toThrow(
      /não contém _id, id ou partnerCode/,
    )
  })

  it('distinguishes canceled and unlinked reservations', () => {
    for (const [booking, expectedCode] of [
      [{ id: 'IZ07J', type: 'canceled' }, 'stays/reservation-canceled'],
      [{ id: 'IZ07J' }, 'stays/reservation-without-listing'],
    ] as const) {
      try {
        requireReservationListingId(booking)
        throw new Error('expected requireReservationListingId to throw')
      } catch (error) {
        expect(error).toMatchObject({ code: expectedCode })
      }
    }
  })

  it('requires the extra-services endpoint to return an array', () => {
    expect(parseStaysExtraServicesPayload([{ _id: 'extra-1', _f_val: 35 }])).toHaveLength(1)
    expect(() => parseStaysExtraServicesPayload({ items: [] })).toThrow(
      /não são uma lista/,
    )
  })

  it('accepts house-rules payloads and rejects malformed fields', () => {
    expect(
      parseStaysHouseRulesPayload({
        smokingAllowed: false,
        petsAllowed: 'no',
        _mshouserules: { pt_BR: 'Silêncio após 22h' },
      }),
    ).toMatchObject({ smokingAllowed: false })
    expect(() => parseStaysHouseRulesPayload({ smokingAllowed: 'no' })).toThrow(
      /smokingAllowed/,
    )
    expect(() => parseStaysHouseRulesPayload([])).toThrow(/regras da casa/)
  })
})
