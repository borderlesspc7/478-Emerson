const PAGARME_API_BASE = 'https://api.pagar.me/core/v5'

function requireSecretKey(): string {
  const key = process.env.PAGARME_SECRET_KEY?.trim()
  if (!key) {
    throw new Error('PAGARME_SECRET_KEY não configurada')
  }
  return key
}

function basicAuthHeader(secretKey: string): string {
  const encoded = Buffer.from(`${secretKey}:`, 'utf8').toString('base64')
  return `Basic ${encoded}`
}

export async function pagarmeRequest(path: string, options: RequestInit = {}) {
  const secretKey = requireSecretKey()
  const url = `${PAGARME_API_BASE}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: basicAuthHeader(secretKey),
      ...(options.headers || {}),
    },
  })

  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Pagar.me HTTP ${response.status}`
    const err = new Error(message) as Error & { status?: number; payload?: unknown }
    err.status = response.status
    err.payload = data
    throw err
  }

  return data as Record<string, unknown>
}

function normalizePhone(phoneDigits: string) {
  const digits = String(phoneDigits || '').replace(/\D/g, '')
  if (digits.length >= 10) {
    const area = digits.slice(-11, -9) || digits.slice(0, 2)
    const number = digits.slice(-9)
    return {
      mobile_phone: {
        country_code: '55',
        area_code: area.padStart(2, '0').slice(-2),
        number: number.padStart(9, '0').slice(-9),
      },
    }
  }
  return {
    mobile_phone: {
      country_code: '55',
      area_code: '41',
      number: '999999999',
    },
  }
}

export function buildCustomerPayload(input: {
  name: string
  email: string
  document: string
  phone: string
}) {
  const doc = String(input.document || '').replace(/\D/g, '')
  return {
    name: String(input.name || 'Hóspede').trim().slice(0, 64),
    email: String(input.email || 'hospede@zen.com.br').trim().slice(0, 64),
    type: 'individual' as const,
    document: doc,
    document_type: doc.length > 11 ? ('cnpj' as const) : ('cpf' as const),
    phones: normalizePhone(input.phone),
  }
}

export async function createPagarmeOrder(input: {
  amount: number
  description: string
  serviceCode: string
  customer: ReturnType<typeof buildCustomerPayload>
  paymentMethod: 'pix' | 'credit_card'
  cardToken?: string
  metadata?: Record<string, string>
}) {
  const item = {
    amount: Math.max(1, Math.round(input.amount)),
    description: String(input.description || 'Serviço').slice(0, 256),
    quantity: 1,
    code: String(input.serviceCode || 'service').slice(0, 52),
  }

  const payment =
    input.paymentMethod === 'pix'
      ? {
          payment_method: 'pix',
          pix: {
            expires_in: 3600,
            additional_information: [
              { name: 'Serviço', value: String(input.description || '').slice(0, 64) },
            ],
          },
        }
      : {
          payment_method: 'credit_card',
          credit_card: {
            installments: 1,
            statement_descriptor: 'ZEN GUIA',
            card_token: input.cardToken,
            card: {
              billing_address: {
                line_1: 'Endereço não informado',
                zip_code: '80010000',
                city: 'Curitiba',
                state: 'PR',
                country: 'BR',
              },
            },
          },
        }

  return pagarmeRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [item],
      customer: input.customer,
      payments: [payment],
      metadata: input.metadata || {},
      closed: true,
    }),
  })
}

export function extractChargeFromOrder(order: Record<string, unknown>) {
  const charges = order.charges
  const charge = Array.isArray(charges) ? (charges[0] as Record<string, unknown>) : null
  const tx = charge?.last_transaction as Record<string, unknown> | undefined
  return {
    orderId: (order.id as string) || null,
    orderCode: (order.code as string) || null,
    orderStatus: (order.status as string) || null,
    chargeId: (charge?.id as string) || null,
    chargeStatus: (charge?.status as string) || null,
    paymentMethod: (charge?.payment_method as string) || null,
    pixQrCode: (tx?.qr_code as string) || null,
    pixQrCodeUrl: (tx?.qr_code_url as string) || null,
    pixExpiresAt: (tx?.expires_at as string) || null,
    transactionStatus: (tx?.status as string) || null,
  }
}

export function isPaidStatus(status: unknown): boolean {
  return String(status || '').toLowerCase() === 'paid'
}
