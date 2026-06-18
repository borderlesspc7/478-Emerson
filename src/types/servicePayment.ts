export type ServicePaymentMethod = 'pix' | 'credit_card'

export type ServicePaymentStatus =
  | 'awaiting_payment'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'cancelled'

export type ServicePaymentRecord = {
  id: string
  userId: string
  serviceId: string
  serviceName: string | null
  priceInCents: number
  paymentMethod: ServicePaymentMethod | null
  paymentStatus: ServicePaymentStatus
  requesterName: string | null
  reservationCode: string | null
  propertyName: string | null
  serviceRequestId: string | null
  pixQrCode: string | null
  pixQrCodeUrl: string | null
  pixExpiresAt: string | null
  createdAt: Date | null
  updatedAt: Date | null
  paidAt: Date | null
}

export type CreatePagarmeOrderPayload = {
  serviceId: string
  paymentMethod: ServicePaymentMethod
  cardToken?: string
  customerName: string
  customerEmail: string
  customerDocument: string
  customerPhone?: string
  reservationCode: string
  propertyName: string
  requesterName: string
}

export type CreatePagarmeOrderResponse = {
  paymentId: string
  paymentMethod: ServicePaymentMethod
  paymentStatus: ServicePaymentStatus | 'paid' | 'awaiting_payment'
  serviceRequestId: string | null
  amountInCents: number
  serviceName: string
  pix: {
    qrCode: string
    qrCodeUrl: string | null
    expiresAt: string | null
  } | null
  card: {
    status: string | null
    paid: boolean
  } | null
}

export type PagarmePaymentStatusResponse = {
  paymentId: string
  paymentStatus: ServicePaymentStatus | 'paid' | 'awaiting_payment'
  serviceRequestId: string | null
  pixQrCode?: string | null
  pixQrCodeUrl?: string | null
  pixExpiresAt?: string | null
}
