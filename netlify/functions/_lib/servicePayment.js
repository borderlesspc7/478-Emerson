import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from './firebaseAdmin.js'
import { isPaidStatus } from './pagarme.js'

export const SERVICE_PAYMENTS_COLLECTION = 'servicePayments'
export const SERVICE_REQUESTS_COLLECTION = 'serviceRequests'
export const SERVICE_CATALOG_COLLECTION = 'serviceCatalog'

export async function loadCatalogService(serviceId) {
  const db = adminDb()
  const snap = await db.collection(SERVICE_CATALOG_COLLECTION).doc(serviceId).get()
  if (!snap.exists) return null
  const data = snap.data() || {}
  const priceInCents =
    typeof data.priceInCents === 'number' && Number.isFinite(data.priceInCents)
      ? Math.max(0, Math.round(data.priceInCents))
      : 0
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  if (!name || priceInCents <= 0) return null
  return {
    id: snap.id,
    name,
    description: typeof data.description === 'string' ? data.description.trim() : '',
    priceInCents,
  }
}

export async function loadUserProfile(uid) {
  const db = adminDb()
  const snap = await db.collection('users').doc(uid).get()
  return snap.exists ? snap.data() || {} : {}
}

/**
 * Cria serviceRequest e marca servicePayment como pago (idempotente).
 */
export async function promotePaymentToServiceRequest(paymentId, chargeHint = {}) {
  const db = adminDb()
  const paymentRef = db.collection(SERVICE_PAYMENTS_COLLECTION).doc(paymentId)

  return db.runTransaction(async (tx) => {
    const paymentSnap = await tx.get(paymentRef)
    if (!paymentSnap.exists) {
      return { ok: false, reason: 'payment-not-found' }
    }

    const payment = paymentSnap.data() || {}
    if (payment.paymentStatus === 'paid' && payment.serviceRequestId) {
      return { ok: true, serviceRequestId: payment.serviceRequestId, already: true }
    }

    const requestRef = payment.serviceRequestId
      ? db.collection(SERVICE_REQUESTS_COLLECTION).doc(payment.serviceRequestId)
      : db.collection(SERVICE_REQUESTS_COLLECTION).doc()

    const requestPayload = {
      userId: payment.userId,
      serviceId: payment.serviceId,
      serviceName: payment.serviceName || '',
      priceInCents: payment.priceInCents || 0,
      requesterName: payment.requesterName || '',
      reservationCode: payment.reservationCode || '',
      propertyName: payment.propertyName || '',
      status: 'pending',
      paymentStatus: 'paid',
      paymentMethod: payment.paymentMethod || null,
      pagarmeOrderId: chargeHint.orderId || payment.pagarmeOrderId || null,
      pagarmeChargeId: chargeHint.chargeId || payment.pagarmeChargeId || null,
      servicePaymentId: paymentId,
      paidAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    tx.set(requestRef, requestPayload, { merge: false })

    tx.update(paymentRef, {
      paymentStatus: 'paid',
      serviceRequestId: requestRef.id,
      pagarmeOrderId: chargeHint.orderId || payment.pagarmeOrderId || null,
      pagarmeChargeId: chargeHint.chargeId || payment.pagarmeChargeId || null,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { ok: true, serviceRequestId: requestRef.id, already: false }
  })
}

export function shouldMarkPaidFromCharge(chargeStatus, transactionStatus) {
  return isPaidStatus(chargeStatus) || isPaidStatus(transactionStatus)
}
