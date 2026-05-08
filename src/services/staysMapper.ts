import { htmlToDescriptionPlainText } from '../lib/propertyDescriptionCards'
import type { GuestStay, ServiceOffer } from '../types/guestStay'
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
  const region = address.region?.trim()
  const cityState = city && state ? `${city}, ${state}` : city || state
  if (region && cityState) return `${cityState} · ${region}`
  if (region) return region
  return cityState
}

function partyFromBooking(booking: StaysBooking): GuestStay['party'] {
  const d = booking.guestsDetails
  if (!d) return null
  const adults = typeof d.adults === 'number' && d.adults >= 0 ? d.adults : 0
  const children = typeof d.children === 'number' && d.children >= 0 ? d.children : 0
  const infants = typeof d.infants === 'number' && d.infants >= 0 ? d.infants : 0
  if (adults + children + infants === 0) return null
  return { adults, children, infants }
}

function priceFromBooking(booking: StaysBooking): GuestStay['totalPrice'] {
  const p = booking.price
  const amount = p?._f_total
  const cur = p?.currency
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null
  return {
    amount,
    currency: typeof cur === 'string' && cur.trim() ? cur.trim() : 'BRL',
  }
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

  const customValues: string[] = []
  const byId = new Map<string, string>()

  for (const raw of fields) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const key = String(o.internalName ?? o.label ?? o.name ?? o._mslabel ?? o.fieldName ?? '').toLowerCase()

    // A Stays pode devolver `customFields` como [{ id, val }] (sem labels).
    const rawId = o.id
    const rawVal = o.val ?? o.value ?? o._f_value ?? o.text ?? o.stringValue
    const id = rawId != null ? String(rawId) : ''
    const str = typeof rawVal === 'string' ? rawVal : rawVal != null ? String(rawVal) : ''
    if (!str.trim()) continue

    customValues.push(str.trim())
    if (id) byId.set(id, str.trim())

    if (/(wifi|wi-?fi|ssid|rede)/i.test(key)) ssid = str.trim()
    if (/(senha|password|pwd|pass)/i.test(key)) password = str.trim()
  }

  // Fallback para ambientes sem labels: IDs conhecidos (SSID / senha).
  // Ex.: respostaStays.txt mostra estes ids a serem usados para Wi‑Fi.
  if (!ssid) {
    ssid = byId.get('1098831365794') || ''
  }
  if (!password) {
    password = byId.get('602022226293') || ''
  }

  // Fallback heurístico: tenta inferir SSID/senha a partir dos valores.
  if (!ssid || !password) {
    const candidates = customValues
      .map((v) => v.trim())
      .filter(Boolean)
      .filter((v) => v.length <= 64)
      .filter((v) => !/\s{2,}/.test(v))

    const looksLikeSsid = (v: string) =>
      /(?:wifi|wi-?fi|5g|2\.4)/i.test(v) || (/-/.test(v) && /^[A-Za-z0-9._-]+$/.test(v))
    const looksLikePassword = (v: string) =>
      /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':",.<>/?\\|]{6,64}$/.test(v) && !looksLikeSsid(v)

    if (!ssid) {
      ssid = candidates.find(looksLikeSsid) || ''
    }
    if (!password) {
      password = candidates.find(looksLikePassword) || ''
    }
  }

  if (ssid || password) {
    return { ssid: ssid || '—', password: password || '—' }
  }
  return null
}

/**
 * Converte extras da reserva Stays em ofertas com nome e valor (quando o catálogo Firestore estiver vazio).
 * Valores `_f_val` em unidades monetárias → centavos = round(val * 100).
 */
export function mapExtraServicesToServiceOffers(extras: StaysExtraService[]): ServiceOffer[] {
  return extras.map((ex, idx) => {
    const name = pickLocalized(ex._msname) || `Serviço extra ${idx + 1}`
    const desc = typeof ex.desc === 'string' ? ex.desc.trim() : ''
    const rawId = ex._id ?? ex._idextra ?? `idx-${idx}`
    const id = `stays-${String(rawId)}`
    const val = ex._f_val
    const priceInCents =
      typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.round(val * 100)) : 0
    return {
      id,
      name,
      description: desc || 'Serviço adicional associado à reserva na Stays.',
      priceInCents,
    }
  })
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

  const descCommercial = listing?._msdesc
    ? htmlToDescriptionPlainText(pickLocalized(listing._msdesc))
    : ''

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
    // Ajuda a extrair Wi‑Fi/códigos quando `customFields` vêm como { id, val }.
    ...(Array.isArray(listing?.customFields)
      ? listing!.customFields
          .map((raw) => {
            if (!raw || typeof raw !== 'object') return ''
            const o = raw as Record<string, unknown>
            const val = o.val ?? o.value ?? o.text ?? o.stringValue
            const str = typeof val === 'string' ? val : val != null ? String(val) : ''
            return str.trim()
          })
          .filter(Boolean)
      : []),
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
      subtype: listing?.subtype?.trim() || null,
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
    party: partyFromBooking(booking),
    totalPrice: priceFromBooking(booking),
  }

  return { guestStay, primaryGuest }
}

export function serviceOffersForGuest(extraServices: StaysExtraService[]): ServiceOffer[] {
  return mapExtraServicesToServiceOffers(extraServices)
}
