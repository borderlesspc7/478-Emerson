export type MediaKind = 'youtube' | 'vimeo' | 'image' | 'unknown'

const YOUTUBE_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i

const VIMEO_RE = /(?:vimeo\.com\/)(?:video\/)?(\d+)/i

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|avif|bmp|svg)(\?|#|$)/i

export function isYoutubeUrl(url: string): boolean {
  return YOUTUBE_RE.test(url.trim())
}

export function isVimeoUrl(url: string): boolean {
  return VIMEO_RE.test(url.trim())
}

export function isEmbeddableVideoUrl(url: string): boolean {
  return isYoutubeUrl(url) || isVimeoUrl(url)
}

export function getMediaKind(url: string): MediaKind {
  const trimmed = url.trim()
  if (!trimmed) return 'unknown'
  if (isYoutubeUrl(trimmed)) return 'youtube'
  if (isVimeoUrl(trimmed)) return 'vimeo'
  if (IMAGE_EXT_RE.test(trimmed)) return 'image'
  if (isEmbeddableVideoUrl(trimmed)) return 'unknown'
  return 'image'
}

export function pickPrimaryGarageMediaUrl(
  imageUrls: string[],
  videoUrl?: string | null
): string | null {
  const video = videoUrl?.trim()
  if (video && isEmbeddableVideoUrl(video)) return video
  const clean = imageUrls.map((u) => u.trim()).filter(Boolean)
  if (clean.length === 0) return null
  const embedded = clean.find((u) => isEmbeddableVideoUrl(u))
  return embedded ?? clean[0]
}

export function buildGarageMediaUrls(
  imageUrls: string[],
  videoUrl?: string | null
): string[] {
  const images = imageUrls.map((u) => u.trim()).filter(Boolean)
  const video = videoUrl?.trim()
  if (video && isEmbeddableVideoUrl(video)) {
    return [video, ...images.filter((u) => u !== video)]
  }
  return images
}
