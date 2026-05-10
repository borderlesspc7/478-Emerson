import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { getFirebaseApp, getFirebaseStorage, isFirebaseConfigured } from '../lib/firebase'

export async function uploadPropertyCurationImage(propertyId: string, file: File): Promise<string> {
  if (!isFirebaseConfigured()) throw new Error('AUTH_NOT_CONFIGURED')
  const app = getFirebaseApp()
  const st = getFirebaseStorage()
  if (!app || !st) throw new Error('AUTH_NOT_CONFIGURED')

  const safe = file.name.replace(/[^\w.-]/g, '_')
  const objectPath = `property-curation/${encodeURIComponent(propertyId)}/${Date.now()}-${safe}`
  const r = ref(st, objectPath)
  await uploadBytes(r, file, { contentType: file.type || undefined })
  return getDownloadURL(r)
}
