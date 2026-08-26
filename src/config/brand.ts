export type BrandConfig = {
  name: string
  fullName: string
  description: string
  primaryColor: string
  primaryHoverColor: string
  primaryMutedColor: string
  fontFamily: string
}

const DEFAULT_BRAND: BrandConfig = {
  name: 'Guia da Zen',
  fullName: 'Guia da Zen - Concierge Digital',
  description: 'O seu guia completo e serviços durante a estadia.',
  /** Verde Zen alinhado ao theme-color / identidade do cliente. */
  primaryColor: '#0d6b5c',
  primaryHoverColor: '#0a5549',
  primaryMutedColor: '#e6f4f1',
  fontFamily: "'Manrope', system-ui, -apple-system, sans-serif",
}

function envText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function envColor(value: unknown, fallback: string): string {
  const candidate = envText(value, fallback)
  return /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback
}

export const BRAND: Readonly<BrandConfig> = Object.freeze({
  name: envText(import.meta.env.VITE_BRAND_NAME, DEFAULT_BRAND.name),
  fullName: envText(import.meta.env.VITE_BRAND_FULL_NAME, DEFAULT_BRAND.fullName),
  description: envText(
    import.meta.env.VITE_BRAND_DESCRIPTION,
    DEFAULT_BRAND.description,
  ),
  primaryColor: envColor(
    import.meta.env.VITE_BRAND_PRIMARY_COLOR,
    DEFAULT_BRAND.primaryColor,
  ),
  primaryHoverColor: envColor(
    import.meta.env.VITE_BRAND_PRIMARY_HOVER_COLOR,
    DEFAULT_BRAND.primaryHoverColor,
  ),
  primaryMutedColor: envColor(
    import.meta.env.VITE_BRAND_PRIMARY_MUTED_COLOR,
    DEFAULT_BRAND.primaryMutedColor,
  ),
  fontFamily: envText(
    import.meta.env.VITE_BRAND_FONT_FAMILY,
    DEFAULT_BRAND.fontFamily,
  ),
})

/** Aplica metadados e tokens configuráveis antes da primeira renderização. */
export function applyBrandConfig(): void {
  document.title = BRAND.name
  const root = document.documentElement
  root.style.setProperty('--font-sans', BRAND.fontFamily)
  root.style.setProperty('--color-primary', BRAND.primaryColor)
  root.style.setProperty('--color-ring', BRAND.primaryColor)
  root.style.setProperty('--accent-primary', BRAND.primaryColor)
  root.style.setProperty('--color-primary-hover', BRAND.primaryHoverColor)
  root.style.setProperty('--color-primary-muted', BRAND.primaryMutedColor)

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (themeColor) themeColor.content = BRAND.primaryColor

  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (description) description.content = BRAND.description
  const appleTitle = document.querySelector<HTMLMetaElement>(
    'meta[name="apple-mobile-web-app-title"]',
  )
  if (appleTitle) appleTitle.content = BRAND.name
}
