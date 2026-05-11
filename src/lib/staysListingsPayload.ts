import type { StaysPropertyListing } from '../types/staysApi'

function isCustomFieldRow(o: Record<string, unknown>): boolean {
  const id = o.id
  if (typeof id === 'number' && ('val' in o || 'value' in o)) return true
  return false
}

function looksLikeStaysListingMongoId(v: unknown): boolean {
  return typeof v === 'string' && /^[a-f\d]{24}$/i.test(v.trim())
}

/** Heurística: objeto de listing Stays vs. outros arrays na resposta. */
export function isListingDocument(raw: unknown): raw is StaysPropertyListing {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  if (isCustomFieldRow(o)) return false
  const id = o._id ?? o.id
  if (typeof id !== 'string' || !id.trim()) return false
  const t = o.type
  if (t === 'booked' || t === 'reserved' || t === 'canceled' || t === 'blocked') return false
  if ('checkInDate' in o && !('address' in o)) return false
  // Reservas trazem checkInDate; listagens na Stays usam normalmente `_id` Mongo sem datas de estadia.
  if (looksLikeStaysListingMongoId(o._id) && !('checkInDate' in o)) return true
  return Boolean(
    o.address ||
      o._mstitle ||
      o.internalName ||
      o.subtype ||
      o._idpropertyType ||
      o._idtype ||
      o._t_imagesMeta ||
      o.images ||
      o.customFields ||
      o.status ||
      o._msdesc
  )
}

/**
 * Alguns envelopes da API trazem contagem total (paginação); usamos para saber quando parar.
 */
export function extractListingsTotalCount(data: unknown): number | undefined {
  if (data == null || typeof data !== 'object') return undefined
  const o = data as Record<string, unknown>
  for (const key of [
    'total',
    'totalCount',
    'totalItems',
    'itemCount',
    'count',
  ] as const) {
    const v = o[key]
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.floor(v)
  }
  const nested = o.pagination ?? o.meta
  if (nested && typeof nested === 'object') {
    const p = nested as Record<string, unknown>
    for (const key of ['total', 'totalCount', 'itemCount'] as const) {
      const v = p[key]
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.floor(v)
    }
  }
  return undefined
}

/**
 * Extrai imóveis de vários formatos de payload da Stays (`listings`, `data`, objeto único, etc.).
 */
export function extractListingsFromPayload(data: unknown): StaysPropertyListing[] {
  const out: StaysPropertyListing[] = []
  const seen = new Set<string>()

  function pushListing(item: unknown) {
    if (!isListingDocument(item)) return
    const l = item
    const k = String(l._id || l.id || '').trim()
    if (!k || seen.has(k)) return
    seen.add(k)
    out.push(l)
  }

  function fromArray(arr: unknown) {
    if (!Array.isArray(arr)) return
    for (const x of arr) pushListing(x)
  }

  if (data == null) return out

  if (Array.isArray(data)) {
    fromArray(data)
    return out
  }

  if (typeof data === 'object') {
    const o = data as Record<string, unknown>
    for (const key of [
      'listings',
      'data',
      'items',
      'results',
      'rows',
      'records',
      'content',
      'list',
      'docs',
      'documents',
    ] as const) {
      const v = o[key]
      fromArray(v)
    }
    if (out.length === 0 && isListingDocument(data)) {
      pushListing(data)
    }
    if (out.length === 0) {
      for (const v of Object.values(o)) {
        if (Array.isArray(v)) fromArray(v)
      }
    }
  }

  return out
}
