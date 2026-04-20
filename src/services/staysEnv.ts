export type StaysCredentials = {
  baseUrl: string
  login: string
  password: string
}

/**
 * Lê credenciais da API Stays via variáveis Vite (nunca fixas no código-fonte).
 */
export function getStaysEnv(): StaysCredentials | null {
  const rawBase = import.meta.env.VITE_STAYS_BASE_URL
  const login = import.meta.env.VITE_STAYS_LOGIN
  const password = import.meta.env.VITE_STAYS_PASSWORD

  if (!rawBase || !login || !password) return null

  const baseUrl = String(rawBase).replace(/\/+$/, '')
  return {
    baseUrl,
    login: String(login),
    password: String(password),
  }
}

/** RFC 7617 Basic: `Authorization: Basic base64(user:password)` */
export function buildBasicAuthorizationHeader(login: string, password: string): string {
  const pair = `${login}:${password}`
  const base64 = globalThis.btoa(pair)
  return `Basic ${base64}`
}
