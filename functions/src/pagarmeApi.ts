import express from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import { onRequest } from 'firebase-functions/v2/https'
import { applyCors, handlePreflight, sendJson } from './lib/cors.js'
import { adminDb, verifyIdToken } from './lib/firebaseAdmin.js'
import {
  buildCustomerPayload,
  createPagarmeOrder,
  extractChargeFromOrder,
  isPaidStatus,
  pagarmeRequest,
} from './lib/pagarme.js'
import {
  loadCatalogService,
  loadUserProfile,
  promotePaymentToServiceRequest,
  SERVICE_PAYMENTS_COLLECTION,
  shouldMarkPaidFromCharge,
} from './lib/servicePayment.js'

const app = express()
app.use(express.json())

app.use((req, res, next) => {
  if (handlePreflight(req, res)) return
  applyCors(req, res)
  next()
})

function onlyDigits(value: unknown): string {
  return String(value || '').replace(/\D/g, '')
}

app.post('/api/pagarme/create-order', async (req, res) => {
  try {
    let decoded
    try {
      decoded = await verifyIdToken(req.headers.authorization)
    } catch {
      sendJson(res, 401, { error: 'auth/unauthorized' })
      return
    }

    const body = req.body as Record<string, unknown>
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
      sendJson(res, 400, { error: 'validation/service-id' })
      return
    }
    if (!customerDocument || (customerDocument.length !== 11 && customerDocument.length !== 14)) {
      sendJson(res, 400, { error: 'validation/document' })
      return
    }
    if (paymentMethod === 'credit_card' && !cardToken) {
      sendJson(res, 400, { error: 'validation/card-token' })
      return
    }

    const catalog = await loadCatalogService(serviceId)
    if (!catalog) {
      sendJson(res, 404, { error: 'catalog/not-found' })
      return
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
      reservationCode: reservationCode || String(profile.reservationCode || ''),
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
        name: customerName || String(profile.displayName || requesterName || 'Hóspede'),
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
          reservation_code: reservationCode || String(profile.reservationCode || ''),
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

      let serviceRequestId: string | null = null
      if (shouldMarkPaidFromCharge(charge.chargeStatus, charge.transactionStatus)) {
        const promoted = await promotePaymentToServiceRequest(paymentRef.id, {
          orderId: charge.orderId,
          chargeId: charge.chargeId,
        })
        serviceRequestId = promoted.serviceRequestId || null
      }

      sendJson(res, 200, {
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
        card:
          paymentMethod === 'credit_card'
            ? {
                status: charge.chargeStatus || charge.transactionStatus,
                paid:
                  isPaidStatus(charge.chargeStatus) || isPaidStatus(charge.transactionStatus),
              }
            : null,
      })
    } catch (e) {
      await paymentRef.update({
        paymentStatus: 'failed',
        updatedAt: FieldValue.serverTimestamp(),
      })
      const message = e instanceof Error ? e.message : 'pagarme/create-order-failed'
      sendJson(res, 502, { error: 'pagarme/create-order-failed', message })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'internal-error'
    sendJson(res, 500, { error: 'internal-error', message })
  }
})

app.get('/api/pagarme/payment-status', async (req, res) => {
  try {
    let decoded
    try {
      decoded = await verifyIdToken(req.headers.authorization)
    } catch {
      sendJson(res, 401, { error: 'auth/unauthorized' })
      return
    }

    const paymentId = String(req.query.paymentId || '').trim()
    if (!paymentId) {
      sendJson(res, 400, { error: 'validation/payment-id' })
      return
    }

    const db = adminDb()
    const snap = await db.collection(SERVICE_PAYMENTS_COLLECTION).doc(paymentId).get()
    if (!snap.exists) {
      sendJson(res, 404, { error: 'payment/not-found' })
      return
    }

    const data = snap.data() || {}
    if (data.userId !== decoded.uid) {
      sendJson(res, 403, { error: 'auth/forbidden' })
      return
    }

    if (
      data.paymentStatus === 'awaiting_payment' &&
      data.pagarmeChargeId &&
      process.env.PAGARME_SECRET_KEY
    ) {
      try {
        const charge = await pagarmeRequest(`/charges/${data.pagarmeChargeId}`, { method: 'GET' })
        const tx = charge?.last_transaction as Record<string, unknown> | undefined
        if (shouldMarkPaidFromCharge(charge?.status, tx?.status)) {
          const promoted = await promotePaymentToServiceRequest(paymentId, {
            orderId: data.pagarmeOrderId as string | null,
            chargeId: data.pagarmeChargeId as string | null,
          })
          const refreshed = await db.collection(SERVICE_PAYMENTS_COLLECTION).doc(paymentId).get()
          const refreshedData = refreshed.data() || {}
          sendJson(res, 200, {
            paymentId,
            paymentStatus: 'paid',
            serviceRequestId: promoted.serviceRequestId || refreshedData.serviceRequestId || null,
          })
          return
        }
      } catch {
        /* consulta opcional */
      }
    }

    sendJson(res, 200, {
      paymentId,
      paymentStatus: data.paymentStatus || 'awaiting_payment',
      serviceRequestId: data.serviceRequestId || null,
      pixQrCode: data.pixQrCode || null,
      pixQrCodeUrl: data.pixQrCodeUrl || null,
      pixExpiresAt: data.pixExpiresAt || null,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'internal-error'
    sendJson(res, 500, { error: 'internal-error', message })
  }
})

app.post('/api/pagarme/webhook', async (req, res) => {
  try {
    const webhookUser = process.env.PAGARME_WEBHOOK_USER?.trim()
    const webhookPass = process.env.PAGARME_WEBHOOK_PASSWORD?.trim()
    if (webhookUser && webhookPass) {
      const authHeader = req.headers.authorization || ''
      const expected = `Basic ${Buffer.from(`${webhookUser}:${webhookPass}`, 'utf8').toString('base64')}`
      if (authHeader !== expected) {
        sendJson(res, 401, { error: 'webhook/unauthorized' })
        return
      }
    }

    const body = req.body as Record<string, unknown>
    const eventType = String(body.type || body.event || '').toLowerCase()
    const data = (body.data || body) as Record<string, unknown>
    const charge = (data.charge || data) as Record<string, unknown>
    const metadata = (charge?.metadata || data?.metadata || {}) as Record<string, unknown>
    const paymentId = String(metadata.service_payment_id || '').trim()

    const chargeStatus = charge?.status || data?.status
    const tx = charge?.last_transaction as Record<string, unknown> | undefined
    const txStatus = tx?.status

    const isPaidEvent =
      eventType.includes('paid') ||
      eventType.includes('payment_succeeded') ||
      shouldMarkPaidFromCharge(chargeStatus, txStatus)

    if (!paymentId) {
      sendJson(res, 200, { ok: true, ignored: true })
      return
    }

    if (isPaidEvent) {
      const order = charge?.order as Record<string, unknown> | undefined
      const dataOrder = data?.order as Record<string, unknown> | undefined
      await promotePaymentToServiceRequest(paymentId, {
        orderId: (order?.id as string) || (dataOrder?.id as string) || null,
        chargeId: (charge?.id as string) || (data?.id as string) || null,
      })
    }

    sendJson(res, 200, { ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'internal-error'
    sendJson(res, 500, { error: 'internal-error', message })
  }
})

app.use('/api/pagarme/*', (_req, res) => {
  sendJson(res, 405, { error: 'method-not-allowed' })
})

export const pagarmeApi = onRequest(
  {
    region: 'southamerica-east1',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  app,
)
