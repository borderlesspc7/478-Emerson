const STORAGE_KEY = 'zen_service_notifications_read_v1'

type StoreShape = Record<string, string[]>

function readStore(): StoreShape {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as StoreShape
  } catch {
    return {}
  }
}

function writeStore(store: StoreShape): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadReadIdsSetForUser(uid: string): Set<string> {
  const store = readStore()
  const list = store[uid]
  if (!Array.isArray(list)) return new Set()
  return new Set(list.filter((id) => typeof id === 'string' && id.length > 0))
}

/** Junta ids lidos ao conjunto persistido do utilizador. */
export function mergeReadIdsForUser(uid: string, ids: Iterable<string>): void {
  const store = readStore()
  const prev = loadReadIdsSetForUser(uid)
  for (const id of ids) {
    if (typeof id === 'string' && id.trim()) prev.add(id.trim())
  }
  store[uid] = [...prev]
  writeStore(store)
}
