/// <reference types="vite/client" />

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
}

interface ImportMetaEnv {
  readonly VITE_STAYS_BASE_URL?: string
  readonly VITE_STAYS_LOGIN?: string
  readonly VITE_STAYS_PASSWORD?: string
  /** WhatsApp Zen (apenas dígitos, ex. 5541999999999) para o botão em Extras. */
  readonly VITE_ZEN_SUPPORT_WHATSAPP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
