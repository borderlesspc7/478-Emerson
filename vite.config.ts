import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Pré-caminho local no dev: mesma origem no browser → Vite reencaminha à Stays (evita CORS/OPTIONS 401).
 * Manter alinhado com `staysEnv` (default /__stays).
 */
const STAYS_DEV_PREFIX = '/__stays'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, process.cwd(), '')
  const rawBase = rootEnv.VITE_STAYS_BASE_URL
  const proxy: Record<
    string,
    {
      target: string
      changeOrigin: boolean
      secure: boolean
      rewrite?: (p: string) => string
    }
  > = {}

  const projectId = rootEnv.VITE_FIREBASE_PROJECT_ID || 'emerson-1e6d2'
  const functionsRegion = rootEnv.VITE_FIREBASE_FUNCTIONS_REGION || 'southamerica-east1'
  const functionsEmulatorHost =
    rootEnv.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001'
  const pagarmeFunctionTarget = `http://${functionsEmulatorHost}/${projectId}/${functionsRegion}/pagarmeApi`
  proxy['/api/pagarme'] = {
    target: pagarmeFunctionTarget,
    changeOrigin: true,
    secure: false,
  }
  proxy['/api/stays'] = {
    target: `http://${functionsEmulatorHost}/${projectId}/${functionsRegion}/staysProxy`,
    changeOrigin: true,
    secure: false,
  }

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
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          importScripts: ['firebase-messaging-sw.js'],
        },
        manifest: {
          id: '/',
          name: 'Guia da Zen - Concierge Digital',
          short_name: 'Guia da Zen',
          description: 'O seu guia completo e serviços durante a estadia.',
          lang: 'pt-BR',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          theme_color: '#0d6b5c',
          background_color: '#ffffff',
          categories: ['travel', 'lifestyle'],
          icons: [
            {
              src: 'icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    server: {
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
