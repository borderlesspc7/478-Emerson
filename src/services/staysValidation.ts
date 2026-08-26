import type {
  StaysBooking,
  StaysExtraService,
  StaysHouseRules,
  StaysPropertyListing,
} from '../types/staysApi'
import { StaysApiError } from './staysClient'

type UnknownRecord = Record<string, unknown>

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalidResponse(detail: string): StaysApiError {
  return new StaysApiError(
    `A API Stays devolveu uma resposta inválida: ${detail}`,
    undefined,
    'stays/invalid-response',
  )
}

function assertOptionalString(
  record: UnknownRecord,
  field: string,
  options?: { pattern?: RegExp },
): void {
  const value = record[field]
  if (value == null) return
  if (typeof value !== 'string') {
    throw invalidResponse(`o campo "${field}" deveria ser texto.`)
  }
  if (options?.pattern && value.trim() && !options.pattern.test(value.trim())) {
    throw invalidResponse(`o campo "${field}" está num formato inesperado.`)
  }
}

function assertOptionalFiniteNumber(record: UnknownRecord, field: string): void {
  const value = record[field]
  if (value == null) return
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalidResponse(`o campo "${field}" deveria ser um número finito.`)
  }
}

/** Valida o contrato mínimo usado pelo app sem exigir campos opcionais da Stays. */
export function parseStaysBookingPayload(payload: unknown): StaysBooking {
  if (!isRecord(payload)) {
    throw invalidResponse('a reserva não é um objeto JSON.')
  }

  for (const field of [
    '_id',
    'id',
    'partnerCode',
    '_idlisting',
    '_idclient',
    'type',
    'checkInDate',
    'checkInTime',
    'checkOutDate',
    'checkOutTime',
  ]) {
    assertOptionalString(payload, field)
  }
  assertOptionalString(payload, 'checkInDate', { pattern: DATE_PATTERN })
  assertOptionalString(payload, 'checkOutDate', { pattern: DATE_PATTERN })
  assertOptionalString(payload, 'checkInTime', { pattern: TIME_PATTERN })
  assertOptionalString(payload, 'checkOutTime', { pattern: TIME_PATTERN })
  assertOptionalFiniteNumber(payload, 'guests')

  const hasIdentifier = ['_id', 'id', 'partnerCode'].some((field) => {
    const value = payload[field]
    return typeof value === 'string' && value.trim().length > 0
  })
  if (!hasIdentifier) {
    throw invalidResponse('a reserva não contém _id, id ou partnerCode.')
  }

  if (payload.guestsDetails != null && !isRecord(payload.guestsDetails)) {
    throw invalidResponse('o campo "guestsDetails" deveria ser um objeto.')
  }
  if (isRecord(payload.guestsDetails)) {
    for (const field of ['adults', 'children', 'infants']) {
      assertOptionalFiniteNumber(payload.guestsDetails, field)
    }
    if (
      payload.guestsDetails.list != null &&
      !Array.isArray(payload.guestsDetails.list)
    ) {
      throw invalidResponse('o campo "guestsDetails.list" deveria ser uma lista.')
    }
  }

  if (payload.price != null && !isRecord(payload.price)) {
    throw invalidResponse('o campo "price" deveria ser um objeto.')
  }
  if (isRecord(payload.price)) {
    assertOptionalFiniteNumber(payload.price, '_f_total')
    assertOptionalString(payload.price, 'currency')
  }

  return payload as StaysBooking
}

export function requireReservationListingId(booking: StaysBooking): string {
  if (booking.type?.trim().toLowerCase() === 'canceled') {
    throw new StaysApiError(
      'Esta reserva está cancelada na Stays.',
      undefined,
      'stays/reservation-canceled',
    )
  }
  const listingId = booking._idlisting?.trim()
  if (!listingId) {
    throw new StaysApiError(
      'A reserva existe, mas não possui um imóvel vinculado na Stays.',
      undefined,
      'stays/reservation-without-listing',
    )
  }
  return listingId
}

export function parseStaysListingPayload(payload: unknown): StaysPropertyListing {
  if (!isRecord(payload)) {
    throw invalidResponse('o imóvel não é um objeto JSON.')
  }
  assertOptionalString(payload, '_id')
  assertOptionalString(payload, 'id')
  assertOptionalString(payload, 'internalName')
  assertOptionalString(payload, 'status')
  const hasIdentifier = ['_id', 'id'].some((field) => {
    const value = payload[field]
    return typeof value === 'string' && value.trim().length > 0
  })
  if (!hasIdentifier) {
    throw invalidResponse('o imóvel não contém _id ou id.')
  }
  return payload as StaysPropertyListing
}

export function parseStaysExtraServicesPayload(payload: unknown): StaysExtraService[] {
  if (!Array.isArray(payload)) {
    throw invalidResponse('os serviços extras não são uma lista.')
  }
  for (const [index, item] of payload.entries()) {
    if (!isRecord(item)) {
      throw invalidResponse(`o serviço extra na posição ${index} não é um objeto.`)
    }
    for (const field of ['_f_unitPrice', '_i_unitCount', '_f_val']) {
      assertOptionalFiniteNumber(item, field)
    }
  }
  return payload as StaysExtraService[]
}

/** Valida o contrato mínimo de house-rules sem exigir campos opcionais. */
export function parseStaysHouseRulesPayload(payload: unknown): StaysHouseRules {
  if (!isRecord(payload)) {
    throw invalidResponse('as regras da casa não são um objeto JSON.')
  }
  const smoking = payload.smokingAllowed
  if (smoking != null && typeof smoking !== 'boolean') {
    throw invalidResponse('o campo "smokingAllowed" deveria ser booleano.')
  }
  const pets = payload.petsAllowed
  if (
    pets != null &&
    typeof pets !== 'boolean' &&
    typeof pets !== 'string'
  ) {
    throw invalidResponse('o campo "petsAllowed" deveria ser texto ou booleano.')
  }
  if (payload._mshouserules != null && !isRecord(payload._mshouserules)) {
    throw invalidResponse('o campo "_mshouserules" deveria ser um objeto.')
  }
  return payload as StaysHouseRules
}
