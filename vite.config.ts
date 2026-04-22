import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Pré-caminho local no dev: mesma origem no browser → Vite reencaminha à Stays (evita CORS/OPTIONS 401).
 * Manter alinhado com `staysEnv` (default /__stays).
 */
const STAYS_DEV_PREFIX = '/__stays'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, process.cwd(), '')
  const rawBase = rootEnv.VITE_STAYS_BASE_URL
  const proxy: Record<string, { target: string; changeOrigin: boolean; secure: boolean; rewrite: (p: string) => string }> = {}

  if (rawBase) {
    try {
      const u = new URL(String(rawBase).trim())
      const target = `${u.protocol}//${u.host}`
      const pathPrefix = (u.pathname.replace(/\/$/, '') || '/external/v1') as string
      proxy[STAYS_DEV_PREFIX] = {
        target,
        changeOrigin: true,
        secure: u.protocol === 'https:',
        rewrite: (p) =>
          p.startsWith(STAYS_DEV_PREFIX)
            ? pathPrefix + p.slice(STAYS_DEV_PREFIX.length)
            : p,
      }
    } catch {
      /* VITE inválida no arranque do config — sem proxy */
    }
  }

  return {
    plugins: [react()],
    server: {
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
