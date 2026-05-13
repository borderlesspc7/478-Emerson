import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type FirebaseStorage,
  type StorageReference,
} from 'firebase/storage'
import { getFirebaseStorage, isFirebaseConfigured } from '../lib/firebase'

const MAX_BYTES = 5 * 1024 * 1024

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

function extensionFromMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function extensionFromFileName(name: string): string | null {
  const i = name.lastIndexOf('.')
  if (i < 0) return null
  const ext = name.slice(i + 1).toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg'
  if (ext === 'png') return 'png'
  if (ext === 'webp') return 'webp'
  return null
}

/**
 * Nome de ficheiro seguro para o path no Storage (sem espaços nem caracteres problemáticos).
 */
export function sanitizeStorageFileName(originalName: string, mimeType: string): string {
  const base = (originalName.split(/[/\\]/).pop() ?? 'image').trim() || 'image'
  const dot = base.lastIndexOf('.')
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
  const safeStem = stem.length > 0 ? stem : 'image'
  const extGuess = extensionFromFileName(base) ?? extensionFromMime(mimeType)
  return `${safeStem}.${extGuess}`
}

function assertAllowedImage(file: File): void {
  if (file.size > MAX_BYTES) {
    throw new Error('storage/file-too-large')
  }
  const mime = (file.type || '').toLowerCase().trim()
  if (mime && ALLOWED_MIME.has(mime)) return
  const ext = extensionFromFileName(file.name)
  if (ext && ['jpg', 'png', 'webp'].includes(ext)) return
  throw new Error('storage/unsupported-format')
}

function sanitizePropertyId(propertyId: string): string {
  return propertyId.trim().replace(/[/\\]/g, '').slice(0, 256)
}

function sanitizeCategory(category: string): string {
  const c = category.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  return c.length > 0 ? c : 'misc'
}

function requireStorage(): FirebaseStorage {
  if (!isFirebaseConfigured()) throw new Error('storage/not-configured')
  const st = getFirebaseStorage()
  if (!st) throw new Error('storage/not-configured')
  return st
}

function allowedPathForDelete(fullPath: string): boolean {
  return fullPath.startsWith('properties/') || fullPath.startsWith('property-curation/')
}

/** Resolve referência a partir da URL HTTPS do Firebase Storage (mesmo bucket). */
function storageRefFromDownloadUrl(st: FirebaseStorage, downloadUrl: string): StorageReference | null {
  try {
    const u = new URL(downloadUrl)
    if (u.hostname !== 'firebasestorage.googleapis.com') return null
    const m = u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/)
    if (!m) return null
    const bucket = decodeURIComponent(m[1])
    const expected = st.app.options.storageBucket
    if (expected && bucket !== expected) return null
    const objectPath = decodeURIComponent(m[2])
    return ref(st, objectPath)
  } catch {
    return null
  }
}

/**
 * Faz upload para `properties/{propertyId}/{category}/{fileName}` e devolve a URL de download.
 * Opcionalmente remove o ficheiro antigo após upload bem-sucedido (`replaceUrl`).
 */
export async function uploadPropertyImage(
  propertyId: string,
  file: File,
  category: string,
  options?: { replaceUrl?: string | null },
): Promise<string> {
  const st = requireStorage()
  const pid = sanitizePropertyId(propertyId)
  if (!pid) throw new Error('storage/invalid-property-id')

  assertAllowedImage(file)

  const mime = (file.type || 'image/jpeg').toLowerCase()
  const finalMime = ALLOWED_MIME.has(mime) ? mime : 'image/jpeg'

  const cat = sanitizeCategory(category)
  const safeBase = sanitizeStorageFileName(file.name, finalMime)
  const unique = `${Date.now()}_${safeBase}`
  const objectPath = `properties/${pid}/${cat}/${unique}`

  const storageRef = ref(st, objectPath)
  await uploadBytes(storageRef, file, { contentType: finalMime })

  let downloadUrl: string
  try {
    downloadUrl = await getDownloadURL(storageRef)
  } catch (e) {
    try {
      await deleteObject(storageRef)
    } catch {
      /* best effort */
    }
    throw e
  }

  const replaceUrl = options?.replaceUrl?.trim()
  if (replaceUrl) {
    try {
      await tryDeletePropertyImageByUrl(replaceUrl)
    } catch {
      /* não falhar o fluxo principal */
    }
  }

  return downloadUrl
}

/**
 * Remove um objeto do Storage a partir da URL de download (mesmo bucket da app).
 * Ignora URLs externas ou inválidas.
 */
export async function tryDeletePropertyImageByUrl(downloadUrl: string): Promise<void> {
  const trimmed = downloadUrl.trim()
  if (!trimmed || !isFirebaseConfigured()) return

  const st = getFirebaseStorage()
  if (!st) return

  try {
    const r = storageRefFromDownloadUrl(st, trimmed)
    if (!r || !allowedPathForDelete(r.fullPath)) return
    await deleteObject(r)
  } catch {
    /* ficheiro já apagado, URL antiga, ou permissões */
  }
}
