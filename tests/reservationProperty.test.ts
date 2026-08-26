import { describe, expect, it } from 'vitest'
import { resolveReservationPropertyDisplay } from '../src/lib/staysReservationProperty'

describe('reservation property display', () => {
  it('reuses a property already loaded in the admin catalog', () => {
    const result = resolveReservationPropertyDisplay(
      'mongo-id-1',
      { _id: 'mongo-id-1', id: 'IZ07J', internalName: 'Fallback' },
      [
        {
          propertyId: 'mongo-id-1',
          shortCode: 'IZ07J',
          title: 'Apartamento Centro',
        },
      ],
    )
    expect(result).toEqual({
      propertyId: 'mongo-id-1',
      summary: 'Apartamento Centro (IZ07J · mongo-id-1)',
    })
  })

  it('builds a fallback from the listing returned by Stays', () => {
    const result = resolveReservationPropertyDisplay(
      'mongo-id-2',
      {
        _id: 'mongo-id-2',
        id: 'AB01C',
        _mstitle: { pt_BR: 'Casa da Praia' },
      },
      [],
    )
    expect(result).toEqual({
      propertyId: 'mongo-id-2',
      summary: 'Casa da Praia (AB01C · mongo-id-2)',
    })
  })
})
