import type { GuestStay } from '../types/guestStay'
import type { StaysLocalizedString } from '../types/staysApi'
import type { StaysCustomFieldGuest } from '../types/staysCustomField'

export type { StaysCustomFieldGuest } from '../types/staysCustomField'

/** Definição global (GET settings/app/listing-custom-fields) — alinha `id` em `listing.customFields`. */
export type StaysListingCustomFieldDefinition = {
  _idfield?: number
  id?: number
  _id?: number | string
  _msname?: StaysLocalizedString
  internalName?: string
}

function pickLocalizedMsName(msgs: StaysLocalizedString | undefined | null): string {
  if (!msgs) return ''
  return (
    msgs.pt_BR ||
    msgs.pt_PT ||
    msgs.en_US ||
    msgs.es_ES ||
    Object.values(msgs).find((v) => typeof v === 'string' && String(v).trim().length > 0) ||
    ''
  )
}

/**
 * Interpreta o JSON de `GET …/settings/app/listing-custom-fields` (array ou envelope).
 */
export function extractListingCustomFieldDefinitionsFromPayload(
  data: unknown,
): StaysListingCustomFieldDefinition[] {
  if (Array.isArray(data)) return data as StaysListingCustomFieldDefinition[]
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    for (const key of [
      'data',
      'items',
      'fields',
      'customFields',
      'listingCustomFields',
      'results',
    ] as const) {
      const v = o[key]
      if (Array.isArray(v)) return v as StaysListingCustomFieldDefinition[]
    }
  }
  return []
}

/** Mapa `id` numérico do campo (string) → título exibível na UI. */
export function buildListingCustomFieldLabelMap(
  definitions: StaysListingCustomFieldDefinition[],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const d of definitions) {
    const rawId = d._idfield ?? d.id ?? d._id
    if (rawId == null) continue
    const key = String(rawId).trim()
    if (!key) continue
    const title =
      pickLocalizedMsName(d._msname)?.trim() || String(d.internalName ?? '').trim()
    if (title) map.set(key, title)
  }
  return map
}

/**
 * Normaliza `listing.customFields` (formatos `{ id, val }`, com ou sem labels).
 * `labelByFieldId` vem de `GET …/settings/app/listing-custom-fields` quando o listing não traz títulos.
 */
export function normalizeStaysCustomFields(
  fields: unknown[] | undefined,
  labelByFieldId?: ReadonlyMap<string, string> | null,
): StaysCustomFieldGuest[] {
  if (!Array.isArray(fields)) return []
  const out: StaysCustomFieldGuest[] = []
  for (let i = 0; i < fields.length; i++) {
    const raw = fields[i]
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const rawId = o.id ?? o._id
    const key =
      rawId != null && String(rawId).trim() !== '' ? String(rawId) : `idx-${i}`
    const rawVal = o.val ?? o.value ?? o._f_value ?? o.text ?? o.stringValue
    const value = typeof rawVal === 'string' ? rawVal : rawVal != null ? String(rawVal) : ''
    const fromCatalog = labelByFieldId?.get(key)?.trim() ?? ''
    const labelRaw =
      fromCatalog ||
      (typeof o.internalName === 'string' && o.internalName.trim() ? o.internalName.trim() : '') ||
      (typeof o.label === 'string' && o.label.trim() ? o.label.trim() : '') ||
      (typeof o.name === 'string' && o.name.trim() ? o.name.trim() : '') ||
      pickLocalizedMsName(o._mslabel as StaysLocalizedString | undefined)?.trim() ||
      (typeof o.fieldName === 'string' && o.fieldName.trim() ? o.fieldName.trim() : '') ||
      (typeof o.title === 'string' && o.title.trim() ? o.title.trim() : '')
    const label = labelRaw ? labelRaw : `Campo ${key}`
    out.push({ key, label, value: value.trim() })
  }
  return out
}

/**
 * Aplica `guestAccessLinks.customFieldVisibility`: chave ausente ou ≠ `false` mantém o campo.
 * Objeto vazio ou `null` → não filtra (retrocompatibilidade).
 */
export function filterGuestStayStaysCustomFields(
  stay: GuestStay,
  visibility: Record<string, boolean> | null | undefined
): GuestStay {
  const list = stay.staysCustomFields
  if (!list?.length) return stay
  if (!visibility || Object.keys(visibility).length === 0) return stay
  const filtered = list.filter((f) => visibility[f.key] !== false)
  return { ...stay, staysCustomFields: filtered }
}
