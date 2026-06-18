import { FieldValue } from 'firebase-admin/firestore'
import { buildCorsHeaders, jsonResponse, parseJsonBody } from './_lib/cors.js'
import { adminDb, verifyIdToken } from './_lib/firebaseAdmin.js'
import {
  buildCustomerPayload,
  createPagarmeOrder,
  extractChargeFromOrder,
  isPaidStatus,
  pagarmeRequest,
} from './_lib/pagarme.js'
import {
  loadCatalogService,
  loadUserProfile,
  promotePaymentToServiceRequest,
  SERVICE_PAYMENTS_COLLECTION,
  shouldMarkPaidFromCharge,
} from './_lib/servicePayment.js'

function routeAction(event) {
  const haystack = [
    event.rawUrl,
    event.path,
    event.rawPath,
    event.queryStringParameters?.splat,
  ]
    .filter(Boolean)
    .join(' ')
  if (haystack.includes('create-order')) return 'create-order'
  if (haystack.includes('webhook')) return 'webhook'
  if (haystack.includes('payment-status')) return 'payment-status'
  return null
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

async function handleCreateOrder(event, corsHeaders) {
  const body = parseJsonBody(event)
  if (body === null) {
    return jsonResponse(400, { error: 'invalid-json' }, corsHeaders)
  }

  let decoded
  try {
    decoded = await verifyIdToken(
      event.headers?.authorization || event.headers?.Authorization,
    )
  } catch {
    return jsonResponse(401, { error: 'auth/unauthorized' }, corsHeaders)
  }

  const serviceId = String(body.serviceId || '').trim()
  const paymentMethod = body.paymentMethod === 'credit_card' ? 'credit_card' : 'pix'
  const cardToken =
    paymentMethod === 'credit_card' ? String(body.cardToken || '').trim() : ''
  const customerName = String(body.customerName || '').trim()
  const customerEmail = String(body.customerEmail || decoded.email || '').trim()
  const customerDocument = onlyDigits(body.customerDocument)
  const customerPhone = onlyDigits(body.customerPhone)
  const reservationCode = String(body.reservationCode || '').trim()
  const propertyName = String(body.propertyName || '').trim()
  const requesterName = String(body.requesterName || customerName || '').trim()

  if (!serviceId) {
    return jsonResponse(400, { error: 'validation/service-id' }, corsHeaders)
  }
  if (!customerDocument || (customerDocument.length !== 11 && customerDocument.length !== 14)) {
    return jsonResponse(400, { error: 'validation/document' }, corsHeaders)
  }
  if (paymentMethod === 'credit_card' && !cardToken) {
    return jsonResponse(400, { error: 'validation/card-token' }, corsHeaders)
  }

  const catalog = await loadCatalogService(serviceId)
  if (!catalog) {
    return jsonResponse(404, { error: 'catalog/not-found' }, corsHeaders)
  }

  const profile = await loadUserProfile(decoded.uid)
  const db = adminDb()
  const paymentRef = db.collection(SERVICE_PAYMENTS_COLLECTION).doc()

  const paymentSeed = {
    userId: decoded.uid,
    serviceId: catalog.id,
    serviceName: catalog.name,
    priceInCents: catalog.priceInCents,
    paymentMethod,
    paymentStatus: 'awaiting_payment',
    requesterName,
    reservationCode: reservationCode || profile.reservationCode || '',
    propertyName,
    pagarmeOrderId: null,
    pagarmeChargeId: null,
    serviceRequestId: null,
    pixQrCode: null,
    pixQrCodeUrl: null,
    pixExpiresAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    paidAt: null,
  }

  await paymentRef.set(paymentSeed)

  try {
    const customer = buildCustomerPayload({
      name: customerName || profile.displayName || requesterName || 'Hóspede',
      email: customerEmail || decoded.email || 'hospede@zen.com.br',
      document: customerDocument,
      phone: customerPhone,
    })

    const order = await createPagarmeOrder({
      amount: catalog.priceInCents,
      description: catalog.name,
      serviceCode: catalog.id,
      customer,
      paymentMethod,
      cardToken,
      metadata: {
        service_payment_id: paymentRef.id,
        user_id: decoded.uid,
        service_id: catalog.id,
        reservation_code: reservationCode || profile.reservationCode || '',
      },
    })

    const charge = extractChargeFromOrder(order)

    await paymentRef.update({
      pagarmeOrderId: charge.orderId,
      pagarmeChargeId: charge.chargeId,
      pixQrCode: charge.pixQrCode,
      pixQrCodeUrl: charge.pixQrCodeUrl,
      pixExpiresAt: charge.pixExpiresAt,
      updatedAt: FieldValue.serverTimestamp(),
      ...(shouldMarkPaidFromCharge(charge.chargeStatus, charge.transactionStatus)
        ? { paymentStatus: 'paid' }
        : {}),
    })

    let serviceRequestId = null
    if (shouldMarkPaidFromCharge(charge.chargeStatus, charge.transactionStatus)) {
      const promoted = await promotePaymentToServiceRequest(paymentRef.id, {
        orderId: charge.orderId,
        chargeId: charge.chargeId,
      })
      serviceRequestId = promoted.serviceRequestId || null
    }

    return jsonResponse(
      200,
      {
        paymentId: paymentRef.id,
        paymentMethod,
        paymentStatus: serviceRequestId ? 'paid' : 'awaiting_payment',
        serviceRequestId,
        amountInCents: catalog.priceInCents,
        serviceName: catalog.name,
        pix: charge.pixQrCode
          ? {
              qrCode: charge.pixQrCode,
              qrCodeUrl: charge.pixQrCodeUrl,
              expiresAt: charge.pixExpiresAt,
            }
          : null,
        card: paymentMethod === 'credit_card'
          ? {
              status: charge.chargeStatus || charge.transactionStatus,
              paid: isPaidStatus(charge.chargeStatus) || isPaidStatus(charge.transactionStatus),
            }
          : null,
      },
      corsHeaders,
    )
  } catch (e) {
    await paymentRef.update({
      paymentStatus: 'failed',
      updatedAt: FieldValue.serverTimestamp(),
    })
    const message = e instanceof Error ? e.message : 'pagarme/create-order-failed'
    return jsonResponse(502, { error: 'pagarme/create-order-failed', message }, corsHeaders)
  }
}

async function handlePaymentStatus(event, corsHeaders) {
  let decoded
  try {
    decoded = await verifyIdToken(
      event.headers?.authorization || event.headers?.Authorization,
    )
  } catch {
    return jsonResponse(401, { error: 'auth/unauthorized' }, corsHeaders)
  }

  const paymentId = String(event.queryStringParameters?.paymentId || '').trim()
  if (!paymentId) {
    return jsonResponse(400, { error: 'validation/payment-id' }, corsHeaders)
  }

  const db = adminDb()
  const snap = await db.collection(SERVICE_PAYMENTS_COLLECTION).doc(paymentId).get()
  if (!snap.exists) {
    return jsonResponse(404, { error: 'payment/not-found' }, corsHeaders)
  }

  const data = snap.data() || {}
  if (data.userId !== decoded.uid) {
    return jsonResponse(403, { error: 'auth/forbidden' }, corsHeaders)
  }

  if (
    data.paymentStatus === 'awaiting_payment' &&
    data.pagarmeChargeId &&
    process.env.PAGARME_SECRET_KEY
  ) {
    try {
      const charge = await pagarmeRequest(`/charges/${data.pagarmeChargeId}`, { method: 'GET' })
      const tx = charge?.last_transaction
      if (shouldMarkPaidFromCharge(charge?.status, tx?.status)) {
        const promoted = await promotePaymentToServiceRequest(paymentId, {
          orderId: data.pagarmeOrderId,
          chargeId: data.pagarmeChargeId,
        })
        const refreshed = await db.collection(SERVICE_PAYMENTS_COLLECTION).doc(paymentId).get()
        const refreshedData = refreshed.data() || {}
        return jsonResponse(
          200,
          {
            paymentId,
            paymentStatus: 'paid',
            serviceRequestId: promoted.serviceRequestId || refreshedData.serviceRequestId || null,
          },
          corsHeaders,
        )
      }
    } catch {
      /* consulta opcional; mantém estado atual */
    }
  }

  return jsonResponse(
    200,
    {
      paymentId,
      paymentStatus: data.paymentStatus || 'awaiting_payment',
      serviceRequestId: data.serviceRequestId || null,
      pixQrCode: data.pixQrCode || null,
      pixQrCodeUrl: data.pixQrCodeUrl || null,
      pixExpiresAt: data.pixExpiresAt || null,
    },
    corsHeaders,
  )
}

async function handleWebhook(event, corsHeaders) {
  const body = parseJsonBody(event)
  if (body === null) {
    return jsonResponse(400, { error: 'invalid-json' }, corsHeaders)
  }

  const webhookUser = process.env.PAGARME_WEBHOOK_USER?.trim()
  const webhookPass = process.env.PAGARME_WEBHOOK_PASSWORD?.trim()
  if (webhookUser && webhookPass) {
    const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
    const expected = `Basic ${Buffer.from(`${webhookUser}:${webhookPass}`, 'utf8').toString('base64')}`
    if (authHeader !== expected) {
      return jsonResponse(401, { error: 'webhook/unauthorized' }, corsHeaders)
    }
  }

  const eventType = String(body.type || body.event || '').toLowerCase()
  const data = body.data || body
  const charge = data.charge || data
  const metadata = charge?.metadata || data?.metadata || {}
  const paymentId = String(metadata.service_payment_id || '').trim()

  const chargeStatus = charge?.status || data?.status
  const txStatus = charge?.last_transaction?.status

  const isPaidEvent =
    eventType.includes('paid') ||
    eventType.includes('payment_succeeded') ||
    shouldMarkPaidFromCharge(chargeStatus, txStatus)

  if (!paymentId) {
    return jsonResponse(200, { ok: true, ignored: true }, corsHeaders)
  }

  if (isPaidEvent) {
    await promotePaymentToServiceRequest(paymentId, {
      orderId: charge?.order?.id || data?.order?.id || null,
      chargeId: charge?.id || data?.id || null,
    })
  }

  return jsonResponse(200, { ok: true }, corsHeaders)
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin
  const corsHeaders = buildCorsHeaders(origin, 'GET,POST,OPTIONS')

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  const action = routeAction(event)

  try {
    if (action === 'create-order' && event.httpMethod === 'POST') {
      return await handleCreateOrder(event, corsHeaders)
    }
    if (action === 'payment-status' && event.httpMethod === 'GET') {
      return await handlePaymentStatus(event, corsHeaders)
    }
    if (action === 'webhook' && event.httpMethod === 'POST') {
      return await handleWebhook(event, corsHeaders)
    }
    return jsonResponse(405, { error: 'method-not-allowed' }, corsHeaders)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'internal-error'
    return jsonResponse(500, { error: 'internal-error', message }, corsHeaders)
  }
}
