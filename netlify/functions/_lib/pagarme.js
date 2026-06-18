const PAGARME_API_BASE = 'https://api.pagar.me/core/v5'

function requireSecretKey() {
  const key = process.env.PAGARME_SECRET_KEY?.trim()
  if (!key) {
    throw new Error('PAGARME_SECRET_KEY não configurada')
  }
  return key
}

function basicAuthHeader(secretKey) {
  const encoded = Buffer.from(`${secretKey}:`, 'utf8').toString('base64')
  return `Basic ${encoded}`
}

export async function pagarmeRequest(path, options = {}) {
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
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { raw: text }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && 'message' in data && String(data.message)) ||
      `Pagar.me HTTP ${response.status}`
    const err = new Error(message)
    err.status = response.status
    err.payload = data
    throw err
  }

  return data
}

function normalizePhone(phoneDigits) {
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

export function buildCustomerPayload({ name, email, document, phone }) {
  const doc = String(document || '').replace(/\D/g, '')
  return {
    name: String(name || 'Hóspede').trim().slice(0, 64),
    email: String(email || 'hospede@zen.com.br').trim().slice(0, 64),
    type: 'individual',
    document: doc,
    document_type: doc.length > 11 ? 'cnpj' : 'cpf',
    phones: normalizePhone(phone),
  }
}

export async function createPagarmeOrder({
  amount,
  description,
  serviceCode,
  customer,
  paymentMethod,
  cardToken,
  metadata,
}) {
  const item = {
    amount: Math.max(1, Math.round(amount)),
    description: String(description || 'Serviço').slice(0, 256),
    quantity: 1,
    code: String(serviceCode || 'service').slice(0, 52),
  }

  const payment =
    paymentMethod === 'pix'
      ? {
          payment_method: 'pix',
          pix: {
            expires_in: 3600,
            additional_information: [
              { name: 'Serviço', value: String(description || '').slice(0, 64) },
            ],
          },
        }
      : {
          payment_method: 'credit_card',
          credit_card: {
            installments: 1,
            statement_descriptor: 'ZEN GUIA',
            card_token: cardToken,
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
      customer,
      payments: [payment],
      metadata: metadata || {},
      closed: true,
    }),
  })
}

export function extractChargeFromOrder(order) {
  const charge = Array.isArray(order?.charges) ? order.charges[0] : null
  const tx = charge?.last_transaction
  return {
    orderId: order?.id || null,
    orderCode: order?.code || null,
    orderStatus: order?.status || null,
    chargeId: charge?.id || null,
    chargeStatus: charge?.status || null,
    paymentMethod: charge?.payment_method || null,
    pixQrCode: tx?.qr_code || null,
    pixQrCodeUrl: tx?.qr_code_url || null,
    pixExpiresAt: tx?.expires_at || null,
    transactionStatus: tx?.status || null,
  }
}

export function isPaidStatus(status) {
  const normalized = String(status || '').toLowerCase()
  return normalized === 'paid'
}
