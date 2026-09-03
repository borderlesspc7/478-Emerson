import type { StaysCustomFieldGuest } from '../types/staysCustomField'

const APARTMENT_PASSWORD_FIELD_IDS = new Set(['379489922697'])
const BUILDING_NAME_FIELD_IDS = new Set(['1138109115081'])

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function cleanGuestValue(value: string): string | null {
  const cleaned = value.trim().replace(/\s*[✓✔]+\s*$/u, '').trim()
  if (!cleaned || /^[-–—]+$/.test(cleaned)) return null
  return cleaned
}

/**
 * Extrai o apartamento do final do código do imóvel.
 * Exemplos: dn11 → 11, e1c102 → 102, i051b → 51B.
 */
export function deriveApartmentNumber(
  listingCode: string | null | undefined,
): string | null {
  const compactCode = listingCode?.trim().replace(/\s+/g, '') ?? ''
  const match = compactCode.match(/(\d+)([a-z]?)$/i)
  if (!match) return null

  const numericPart = String(Number.parseInt(match[1], 10))
  if (numericPart === 'NaN') return null
  return `${numericPart}${match[2].toUpperCase()}`
}

export function findApartmentPassword(
  fields: StaysCustomFieldGuest[] | null | undefined,
): string | null {
  if (!fields?.length) return null

  const knownField = fields.find((field) => APARTMENT_PASSWORD_FIELD_IDS.has(field.key))
  const knownValue = knownField ? cleanGuestValue(knownField.value) : null
  if (knownValue) return knownValue

  const candidates = fields
    .filter((field) => field.value.trim())
    .map((field) => ({ field, label: normalizeSearchText(field.label) }))
    .filter(
      ({ label }) =>
        /senha|password|codigo|code/.test(label) &&
        !/wifi|wi-fi|rede|portao|garagem|parking/.test(label),
    )

  const preferred = candidates.find(({ label }) =>
    /apto|apartamento|imovel|porta|fechadura|entrada|acesso/.test(label),
  )
  const selected = (preferred ?? candidates[0])?.field.value ?? ''
  return cleanGuestValue(selected)
}

export function findBuildingName(
  fields: StaysCustomFieldGuest[] | null | undefined,
): string | null {
  if (!fields?.length) return null

  const knownField = fields.find((field) => BUILDING_NAME_FIELD_IDS.has(field.key))
  const knownValue = knownField ? cleanGuestValue(knownField.value) : null
  if (knownValue) return knownValue

  const candidate = fields.find((field) => {
    const label = normalizeSearchText(field.label)
    return /empreendimento|condominio|edificio|predio|building/.test(label)
  })
  return candidate ? cleanGuestValue(candidate.value) : null
}
