import { getFirebaseIdToken } from '../lib/firebaseIdToken'
import type {
  CreatePagarmeOrderPayload,
  CreatePagarmeOrderResponse,
  PagarmePaymentStatusResponse,
} from '../types/servicePayment'

const PAGARME_API_PREFIX = '/api/pagarme'

async function pagarmeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getFirebaseIdToken()
  const response = await fetch(`${PAGARME_API_PREFIX}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  })

  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string; message?: string })
    | null

  if (!response.ok) {
    const code = data && typeof data === 'object' && 'error' in data ? String(data.error) : 'pagarme/request-failed'
    const message =
      data && typeof data === 'object' && 'message' in data && data.message
        ? String(data.message)
        : code
    throw new Error(message)
  }

  return data as T
}

export async function createPagarmeServiceOrder(
  payload: CreatePagarmeOrderPayload,
): Promise<CreatePagarmeOrderResponse> {
  return pagarmeFetch<CreatePagarmeOrderResponse>('/create-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchPagarmePaymentStatus(
  paymentId: string,
): Promise<PagarmePaymentStatusResponse> {
  const qs = new URLSearchParams({ paymentId })
  return pagarmeFetch<PagarmePaymentStatusResponse>(`/payment-status?${qs.toString()}`, {
    method: 'GET',
  })
}
