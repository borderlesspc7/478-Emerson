import axios, { AxiosError, type AxiosInstance } from 'axios'
import { buildBasicAuthorizationHeader, getStaysEnv, type StaysCredentials } from './staysEnv'

export class StaysApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'StaysApiError'
    this.status = status
    this.code = code
  }
}

function mapAxiosError(error: unknown): StaysApiError {
  if (!axios.isAxiosError(error)) {
    return new StaysApiError(
      error instanceof Error ? error.message : 'Erro desconhecido na API Stays.',
      undefined,
      'stays/unknown'
    )
  }

  const status = error.response?.status
  if (status === 401) {
    return new StaysApiError('Credenciais da API Stays inválidas ou expiradas.', 401, 'stays/unauthorized')
  }
  if (status === 403) {
    return new StaysApiError('Acesso negado à API Stays.', 403, 'stays/forbidden')
  }
  if (status === 404) {
    return new StaysApiError('Reserva não encontrada na Stays.', 404, 'stays/not-found')
  }
  if (status && status >= 500) {
    return new StaysApiError('Serviço Stays indisponível. Tente novamente em instantes.', status, 'stays/server-error')
  }
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
    return new StaysApiError('Falha de rede ao contatar a Stays.', undefined, 'stays/network')
  }

  return new StaysApiError(
    error.message || 'Não foi possível concluir a chamada à API Stays.',
    status,
    'stays/request-failed'
  )
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableStaysFailure(e: unknown): boolean {
  if (e instanceof StaysApiError) {
    const s = e.status
    return s === 500 || s === 502 || s === 503 || s === 504
  }
  if (axios.isAxiosError(e)) {
    const s = e.response?.status
    return (
      s === 500 ||
      s === 502 ||
      s === 503 ||
      s === 504 ||
      e.code === 'ERR_NETWORK'
    )
  }
  return false
}

export async function withStaysRetry<T>(
  fn: () => Promise<T>,
  { retries = 2 }: { retries?: number } = {}
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      const retryable = isRetryableStaysFailure(e)
      if (!retryable || attempt === retries) {
        throw e instanceof StaysApiError ? e : mapAxiosError(e)
      }
      await sleep(250 * (attempt + 1))
    }
  }
  throw lastError instanceof StaysApiError ? lastError : mapAxiosError(lastError)
}

let singleton: AxiosInstance | null = null

export function getStaysAxios(): AxiosInstance | null {
  const env = getStaysEnv()
  if (!env) return null
  if (!singleton) {
    singleton = createStaysAxiosInstance(env)
  }
  return singleton
}

export function resetStaysAxiosForTests(): void {
  singleton = null
}

function createStaysAxiosInstance(creds: StaysCredentials): AxiosInstance {
  const authHeader = buildBasicAuthorizationHeader(creds.login, creds.password)

  const instance = axios.create({
    baseURL: `${creds.baseUrl}/`,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 25_000,
  })

  instance.interceptors.response.use(
    (res) => res,
    (error: AxiosError) => Promise.reject(mapAxiosError(error))
  )

  return instance
}
