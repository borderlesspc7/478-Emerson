export type StaysCredentials = {
  baseUrl: string
  authHeader?: string
}

/**
 * Lê credenciais da API Stays via variáveis Vite (nunca fixas no código-fonte).
 */
const STAYS_DEV_PREFIX_DEFAULT = '/__stays'
const STAYS_PROD_PREFIX_DEFAULT = '/api/stays'

/**
 * No browser, chamadas directas a `https://...stays.com.br/external/...` falham
 * (CORS; o preflight OPTIONS muitas vezes 401). Em `import.meta.env.DEV` usamos
 * o proxy do Vite: mesma origem com prefixo `VITE_STAYS_DEV_PREFIX` (defeito
 * /__stays) → o servidor encaminha para a URL real. Em `build` o proxy não existe
 * (usar função/Cloud proxy ou o que a Stays permitir). Desligar: VITE_STAYS_NO_DEV_PROXY=1
 *
 * Em produção, por padrão usamos um proxy na mesma origem (`/api/stays`) para
 * evitar CORS e não expor credenciais no bundle. Desligar: VITE_STAYS_NO_PROD_PROXY=1
 */
function resolveStaysBaseUrl(raw: string): string {
  const trimmed = String(raw).trim().replace(/\/+$/, '')
  const noProxy = import.meta.env.VITE_STAYS_NO_DEV_PROXY === '1'
  if (import.meta.env.DEV && !noProxy) {
    const p =
      (import.meta.env.VITE_STAYS_DEV_PREFIX as string | undefined)?.trim() ||
      STAYS_DEV_PREFIX_DEFAULT
    return p.startsWith('/') ? p : `/${p}`
  }
  const noProdProxy = import.meta.env.VITE_STAYS_NO_PROD_PROXY === '1'
  if (import.meta.env.PROD && !noProdProxy) {
    const p =
      (import.meta.env.VITE_STAYS_PROD_PREFIX as string | undefined)?.trim() ||
      STAYS_PROD_PREFIX_DEFAULT
    return p.startsWith('/') ? p : `/${p}`
  }
  return trimmed
}

export function getStaysEnv(): StaysCredentials | null {
  const rawBase = import.meta.env.VITE_STAYS_BASE_URL
  const login = import.meta.env.VITE_STAYS_LOGIN
  const password = import.meta.env.VITE_STAYS_PASSWORD

  if (!rawBase) return null

  // trim: espaços no .env (ex. após o =) quebram o Basic Auth e dão 401
  const baseUrl = resolveStaysBaseUrl(String(rawBase).trim().replace(/\/+$/, ''))
  const usingProxy =
    baseUrl.startsWith('/') || baseUrl.startsWith('http://localhost') || baseUrl.startsWith('https://localhost')

  /**
   * Em proxy:
   * - DEV (/__stays): o Vite só reencaminha e não acrescenta headers → precisamos enviar Basic Auth.
   * - PROD (/api/stays): a Netlify Function injeta a auth no servidor → não exigir credenciais no cliente.
   */
  if (usingProxy) {
    if (import.meta.env.DEV) {
      if (!login || !password) return null
      return {
        baseUrl,
        authHeader: buildBasicAuthorizationHeader(String(login).trim(), String(password).trim()),
      }
    }
    return { baseUrl }
  }

  if (!login || !password) return null
  return {
    baseUrl,
    authHeader: buildBasicAuthorizationHeader(String(login).trim(), String(password).trim()),
  }
}

/** RFC 7617 Basic: `Authorization: Basic base64(user:password)` */
export function buildBasicAuthorizationHeader(login: string, password: string): string {
  const pair = `${login}:${password}`
  const base64 = globalThis.btoa(pair)
  return `Basic ${base64}`
}
