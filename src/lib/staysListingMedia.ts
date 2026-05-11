import type { StaysPropertyListing } from '../types/staysApi'

/** URL de imagem para cartão do imóvel (capa Stays ou primeira foto com URL). */
export function pickListingCardImageUrl(listing: StaysPropertyListing | null): string | null {
  if (!listing) return null
  const meta = listing._t_mainImageMeta as { url?: string } | undefined
  if (meta?.url && typeof meta.url === 'string' && meta.url.trim()) {
    return meta.url.trim()
  }
  const mainId = listing._idmainImage
  if (typeof mainId === 'string' && mainId.trim()) {
    return `https://bsc.stays.com.br/image/${encodeURIComponent(mainId.trim())}`
  }
  const imgs = listing._t_imagesMeta
  if (Array.isArray(imgs)) {
    const withUrl = imgs.find(
      (x) => x && typeof x === 'object' && typeof (x as { url?: string }).url === 'string'
    ) as { url?: string } | undefined
    if (withUrl?.url?.trim()) return withUrl.url.trim()
  }
  return null
}
