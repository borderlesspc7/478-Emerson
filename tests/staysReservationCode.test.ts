import { describe, expect, it } from 'vitest'
import {
  resolveBookingPortalName,
  resolveGuestReservationCode,
} from '../src/lib/staysReservationCode'

describe('guest reservation code', () => {
  it('prioritizes the external partner code', () => {
    expect(
      resolveGuestReservationCode({
        id: 'OF05J',
        partnerCode: '5574901098',
      }),
    ).toBe('5574901098')
  })

  it('falls back to the Stays id for internal reservations', () => {
    expect(resolveGuestReservationCode({ id: 'OF05J' })).toBe('OF05J')
  })

  it('ignores blank identifiers and preserves a useful lookup fallback', () => {
    expect(
      resolveGuestReservationCode(
        { _id: 'mongo-id', id: ' ', partnerCode: ' ' },
        'LOOKUP-123',
      ),
    ).toBe('LOOKUP-123')
  })

  it('normalizes the technical Stays partner name for guests', () => {
    expect(resolveBookingPortalName({ partner: { name: 'API booking.com' } })).toBe(
      'Booking.com',
    )
    expect(resolveBookingPortalName({ partner: { name: 'API airbnb' } })).toBe('Airbnb')
    expect(resolveBookingPortalName({ id: 'INTERNAL' })).toBeNull()
  })
})
