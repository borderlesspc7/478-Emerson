import { mockServiceOffers } from '../data/mockGuestStay'
import type { GuestStay, ServiceOffer, ServiceOfferId } from '../types/guestStay'
import type {
  StaysBooking,
  StaysExtraService,
  StaysGuest,
  StaysHouseRules,
  StaysLocalizedString,
  StaysPropertyListing,
} from '../types/staysApi'

const DEFAULT_TZ = '-03:00'

function pickLocalized(msgs: StaysLocalizedString | undefined | null): string {
  if (!msgs) return ''
  return (
    msgs.pt_BR ||
    msgs.pt_PT ||
    msgs.en_US ||
    msgs.es_ES ||
    Object.values(msgs).find((v) => typeof v === 'string' && v.trim().length > 0) ||
    ''
  )
}

function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatPostal(zip: string | undefined): string | null {
  if (!zip) return null
  const digits = zip.replace(/\D/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  return zip
}

/** Junta data (YYYY-MM-DD) e hora (HH:mm) em ISO 8601 com offset fixo (estadia BR). */
export function toStayIso(date?: string, time?: string, endOfDay = false): string {
  const d = date ?? new Date().toISOString().slice(0, 10)
  let t = time?.trim()
  if (!t) {
    t = endOfDay ? '23:59' : '15:00'
  }
  const [hh, mm] = t.split(':').map((x) => parseInt(x, 10))
  const safeH = Number.isFinite(hh) ? hh : endOfDay ? 23 : 15
  const safeM = Number.isFinite(mm) ? mm : endOfDay ? 59 : 0
  return `${d}T${String(safeH).padStart(2, '0')}:${String(safeM).padStart(2, '0')}:00${DEFAULT_TZ}`
}

export function pickPrimaryStaysGuest(booking: StaysBooking): StaysGuest | null {
  const list = booking.guestsDetails?.list
  if (!list?.length) return null
  const primary = list.find((g) => g.primary)
  const chosen = primary ?? list[0]
  const name = chosen?.name?.trim()
  if (!name) return null
  return { name, email: chosen?.email ?? null }
}

function buildAddressLine(address: StaysPropertyListing['address']): string {
  if (!address) return ''
  const parts = [address.street, address.streetNumber].filter(Boolean)
  return parts.join(', ').trim()
}

function buildCityLine(address: StaysPropertyListing['address']): string {
  if (!address) return ''
  const city = address.city ?? ''
  const state = address.stateCode ?? address.state ?? ''
  if (city && state) return `${city}, ${state}`
  return city || state
}

function truncate(text: string, max: number): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1))}…`
}

/** Heurística: SSID / senha do Wi‑Fi em texto livre (notas Stays, internalNote, etc.). */
export function tryParseWifiFromBlob(plain: string): { ssid: string; password: string } | null {
  const t = plain.replace(/\s+/g, ' ')
  let ssid: string | undefined
  let password: string | undefined

  const ssidPatterns = [
    /(?:ssid|rede|wifi|wi-fi)\s*[:：]\s*([^\s,;]+)/i,
    /(?:nome\s+da\s+rede)\s*[:：]\s*([^\s,;]+)/i,
  ]
  for (const p of ssidPatterns) {
    const m = t.match(p)
    if (m?.[1]) {
      ssid = m[1].replace(/[.,;:)]+$/, '')
      break
    }
  }

  const passPatterns = [
    /(?:senha|password|pwd|pass)\s*(?:do\s+wifi|da\s+rede)?\s*[:：]\s*([^\s,;]+)/i,
    /(?:wifi|wi-fi)\s*—\s*[^\s]+\s*\/\s*([^\s,;]+)/i,
  ]
  for (const p of passPatterns) {
    const m = t.match(p)
    if (m?.[1]) {
      password = m[1].replace(/[.,;:)]+$/, '')
      break
    }
  }

  if (ssid && password) return { ssid, password }
  if (ssid) return { ssid, password: '—' }
  if (password) return { ssid: '—', password }
  return null
}

function extractDoorPasswordFromBlob(plain: string): string | null {
  const patterns: RegExp[] = [
    /(?:c[oó]digo|senha)\s*(?:da\s*)?(?:porta|fechadura)\s*[:：]?\s*([0-9#a-z]+)/i,
    /(?:porta|fechadura)\s*[:：]\s*([0-9#*]{3,})/i,
  ]
  for (const p of patterns) {
    const m = plain.match(p)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function extractGarageSpotFromBlob(plain: string): string | null {
  const m = plain.match(
    /(?:vaga|garagem|estacionamento|parking)\s*(?:n[ºo°.]?|de)?\s*[:：]?\s*([^\n.]+?)(?:\.|,|$)/i
  )
  return m?.[1]?.trim() ?? null
}

function harvestWifiFromCustomFields(
  fields: StaysPropertyListing['customFields']
): { ssid: string; password: string } | null {
  if (!Array.isArray(fields)) return null
  let ssid = ''
  let password = ''
  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const key = String(
      o.internalName ?? o.label ?? o.name ?? o._mslabel ?? o.fieldName ?? ''
    ).toLowerCase()
    const val = o.value ?? o._f_value ?? o.text ?? o.stringValue
    const str = typeof val === 'string' ? val : val != null ? String(val) : ''
    if (!str.trim()) continue
    if (/(wifi|wi-?fi|ssid|rede)/i.test(key)) ssid = str.trim()
    if (/(senha|password|pwd|pass)/i.test(key)) password = str.trim()
  }
  if (ssid || password) {
    return { ssid: ssid || '—', password: password || '—' }
  }
  return null
}

function mapExtraToOfferId(nameLower: string): ServiceOfferId | null {
  if (/limp|clean/i.test(nameLower)) return 'cleaning'
  if (/lenç|linen|roupa|bed|toalh/i.test(nameLower)) return 'linen'
  if (/manuten|maint|repar/i.test(nameLower)) return 'maintenance'
  if (/concierg|recep|porteir|portaria/i.test(nameLower)) return 'concierge'
  return null
}

/**
 * Sobrepõe preços vindos dos extras da reserva aos itens padrão do app (IDs fixos para i18n).
 * Valores `_f_val` tratados como valor monetário na moeda da reserva → centavos = round(val * 100).
 */
export function mapExtraServicesToServiceOffers(extras: StaysExtraService[]): ServiceOffer[] {
  const byId = new Map<ServiceOfferId, number>(
    mockServiceOffers.map((o) => [o.id, o.priceInCents])
  )

  for (const ex of extras) {
    const label = pickLocalized(ex._msname).toLowerCase()
    const id = mapExtraToOfferId(label)
    const val = ex._f_val
    if (id != null && typeof val === 'number' && Number.isFinite(val)) {
      byId.set(id, Math.max(0, Math.round(val * 100)))
    }
  }

  return (['cleaning', 'linen', 'maintenance', 'concierge'] as const).map((id) => ({
    id,
    priceInCents: byId.get(id) ?? 0,
  }))
}

export type StaysGuestStayBundle = {
  guestStay: GuestStay
  primaryGuest: StaysGuest | null
}

export function mapStaysToGuestStayBundle(
  reservationCode: string,
  booking: StaysBooking,
  listing: StaysPropertyListing | null,
  houseRules: StaysHouseRules | null
): StaysGuestStayBundle {
  const title = listing?._mstitle ? pickLocalized(listing._mstitle) : ''
  const propertyName =
    title.trim() ||
    listing?.internalName?.trim() ||
    booking.id ||
    reservationCode

  const unit =
    listing?.internalName?.trim() ||
    listing?.id?.trim() ||
    booking.id ||
    '—'

  const addr = listing?.address
  const addressLine = buildAddressLine(addr) || '—'
  const city = buildCityLine(addr) || '—'

  const descCommercial = listing?._msdesc ? stripHtml(pickLocalized(listing._msdesc)) : ''

  const lmsAccess = listing?._msaccess ? stripHtml(pickLocalized(listing._msaccess)) : ''
  const lmsNotes = listing?._msnotes ? stripHtml(pickLocalized(listing._msnotes)) : ''
  const mssummary = listing?._mssummary ? stripHtml(pickLocalized(listing._mssummary)) : ''

  const rulesHtml = houseRules?._mshouserules ? pickLocalized(houseRules._mshouserules) : ''
  const houseRulesPlain = rulesHtml ? stripHtml(rulesHtml) : ''

  const internalNote = booking.internalNote?.trim() ?? ''

  const accessParts: string[] = []
  if (lmsAccess) accessParts.push(lmsAccess)
  if (lmsNotes && lmsNotes !== lmsAccess) accessParts.push(lmsNotes)
  if (houseRulesPlain) {
    accessParts.push(houseRulesPlain)
  }

  const instructionsJoined =
    accessParts.filter(Boolean).join('\n\n') ||
    'Detalhes adicionais podem ser enviados pelo canal oficial da reserva.'

  const summaryText = mssummary
    ? truncate(mssummary, 240)
    : lmsAccess
    ? truncate(lmsAccess, 240)
    : houseRulesPlain
    ? 'Regras da propriedade e orientações abaixo.'
    : 'Informações de acesso e estadia abaixo.'

  const blobForExtras = [
    internalNote,
    lmsAccess,
    lmsNotes,
    descCommercial,
    pickLocalized(listing?._msdesc),
    instructionsJoined,
  ].join('\n')

  const doorFromBlob = extractDoorPasswordFromBlob(blobForExtras)
  const garageFromBlob = extractGarageSpotFromBlob(blobForExtras)

  let wifi = harvestWifiFromCustomFields(listing?.customFields)
  if (!wifi) {
    wifi = tryParseWifiFromBlob(blobForExtras)
  }
  if (!wifi) {
    wifi = { ssid: '—', password: '—' }
  }

  const primaryGuest = pickPrimaryStaysGuest(booking)

  const guestStay: GuestStay = {
    reservationCode,
    property: {
      name: propertyName,
      unit,
      floor: addr?.additional?.trim() || null,
      addressLine,
      city,
      postalCode: formatPostal(addr?.zip),
      description: descCommercial || null,
    },
    checkInAt: toStayIso(booking.checkInDate, booking.checkInTime, false),
    checkOutAt: toStayIso(booking.checkOutDate, booking.checkOutTime, true),
    wifi,
    access: {
      summary: summaryText,
      instructions: instructionsJoined,
      doorPassword: doorFromBlob,
      floor: addr?.additional?.trim() || null,
      garageSpot: garageFromBlob,
    },
    notes: internalNote || null,
  }

  return { guestStay, primaryGuest }
}

export function serviceOffersForGuest(extraServices: StaysExtraService[]): ServiceOffer[] {
  return mapExtraServicesToServiceOffers(extraServices)
}
