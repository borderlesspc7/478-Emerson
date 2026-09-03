import { describe, expect, it } from 'vitest'
import {
  deriveApartmentNumber,
  findApartmentPassword,
  findBuildingName,
} from '../src/lib/guestApartment'

describe('guest apartment details', () => {
  it.each([
    ['dn11', '11'],
    ['e1c102', '102'],
    ['i051b', '51B'],
    ['WS01I', '1I'],
  ])('derives apartment %s as %s', (listingCode, expected) => {
    expect(deriveApartmentNumber(listingCode)).toBe(expected)
  })

  it('returns null when the listing code has no apartment suffix', () => {
    expect(deriveApartmentNumber('CENTRO')).toBeNull()
    expect(deriveApartmentNumber(null)).toBeNull()
  })

  it('prioritizes an apartment password and ignores unrelated credentials', () => {
    expect(
      findApartmentPassword([
        { key: 'wifi', label: 'Senha do Wi-Fi', value: 'internet-123' },
        { key: 'gate', label: 'Senha portão externo', value: '9876' },
        { key: 'door', label: 'Senha do apartamento', value: '4321#' },
      ]),
    ).toBe('4321#')
  })

  it('supports a generic visible password field as fallback', () => {
    expect(
      findApartmentPassword([{ key: 'password', label: 'Senha', value: '2468' }]),
    ).toBe('2468')
    expect(findApartmentPassword([])).toBeNull()
  })

  it('recognizes the apartment password field used by Stays and removes its check mark', () => {
    expect(
      findApartmentPassword([
        { key: '379489922697', label: 'Campo 379489922697', value: '1133 ✓' },
      ]),
    ).toBe('1133')
  })

  it('recognizes the building name from its Stays field id or descriptive label', () => {
    expect(
      findBuildingName([
        { key: '1138109115081', label: 'Campo 1138109115081', value: 'Dona Neusa' },
      ]),
    ).toBe('Dona Neusa')
    expect(
      findBuildingName([{ key: 'building', label: 'Empreendimento', value: 'Edifício Sol' }]),
    ).toBe('Edifício Sol')
  })
})
