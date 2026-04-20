/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STAYS_BASE_URL?: string
  readonly VITE_STAYS_LOGIN?: string
  readonly VITE_STAYS_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
