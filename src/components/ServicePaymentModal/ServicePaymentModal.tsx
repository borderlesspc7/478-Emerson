import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatServicePrice } from '../../lib/formatServicePrice'
import {
  createPagarmeServiceOrder,
  fetchPagarmePaymentStatus,
} from '../../services/pagarmePaymentApi'
import { isPagarmePublicKeyConfigured, tokenizePagarmeCard } from '../../services/pagarmeTokenizeCard'
import { subscribeServicePayment } from '../../services/servicePaymentsFirestore'
import type { ServiceOffer } from '../../types/guestStay'
import type { ServicePaymentMethod } from '../../types/servicePayment'
import { Button } from '../ui/Button/Button'
import './ServicePaymentModal.css'

export type ServicePaymentModalContext = {
  userName: string
  userEmail?: string
  reservationCode: string
  propertyName: string
}

export type ServicePaymentModalProps = {
  offer: ServiceOffer | null
  open: boolean
  uid: string
  onClose: () => void
  onPaid: (serviceRequestId: string) => void
  context: ServicePaymentModalContext
}

type Step = 'form' | 'pix' | 'processing' | 'success'

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function ServicePaymentModal({
  offer,
  open,
  uid,
  onClose,
  onPaid,
  context,
}: ServicePaymentModalProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const [method, setMethod] = useState<ServicePaymentMethod>('pix')
  const [step, setStep] = useState<Step>('form')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [pixQrCode, setPixQrCode] = useState<string | null>(null)
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState(context.userName)
  const [customerEmail, setCustomerEmail] = useState(context.userEmail || '')
  const [customerDocument, setCustomerDocument] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [cardExpMonth, setCardExpMonth] = useState('')
  const [cardExpYear, setCardExpYear] = useState('')
  const [cardCvv, setCardCvv] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const formattedPrice = useMemo(
    () => (offer ? formatServicePrice(locale, offer.priceInCents) : ''),
    [offer, locale],
  )

  const resetState = useCallback(() => {
    setMethod('pix')
    setStep('form')
    setError(null)
    setSubmitting(false)
    setPaymentId(null)
    setPixQrCode(null)
    setPixQrCodeUrl(null)
    setCustomerName(context.userName)
    setCustomerEmail(context.userEmail || '')
    setCustomerDocument('')
    setCustomerPhone('')
    setCardNumber('')
    setCardHolder('')
    setCardExpMonth('')
    setCardExpYear('')
    setCardCvv('')
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [context.userEmail, context.userName])

  useEffect(() => {
    if (!open) {
      resetState()
    }
  }, [open, resetState])

  const handlePaid = useCallback(
    (serviceRequestId: string) => {
      setStep('success')
      onPaid(serviceRequestId)
    },
    [onPaid],
  )

  useEffect(() => {
    if (!open || !paymentId || !uid || step !== 'pix') return undefined

    const unsub = subscribeServicePayment(
      paymentId,
      uid,
      (record) => {
        if (!record) return
        if (record.paymentStatus === 'paid' && record.serviceRequestId) {
          handlePaid(record.serviceRequestId)
        }
      },
      () => undefined,
    )

    pollRef.current = setInterval(() => {
      void fetchPagarmePaymentStatus(paymentId)
        .then((status) => {
          if (status.paymentStatus === 'paid' && status.serviceRequestId) {
            handlePaid(status.serviceRequestId)
          }
        })
        .catch(() => undefined)
    }, 4000)

    return () => {
      unsub()
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [open, paymentId, uid, step, handlePaid])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, submitting, onClose])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!offer) return

    const docDigits = onlyDigits(customerDocument)
    if (docDigits.length !== 11 && docDigits.length !== 14) {
      setError(t('servicePayment.errorDocument'))
      return
    }

    setError(null)
    setSubmitting(true)
    setStep('processing')

    try {
      let cardToken: string | undefined
      if (method === 'credit_card') {
        if (!isPagarmePublicKeyConfigured()) {
          throw new Error(t('servicePayment.errorPublicKey'))
        }
        cardToken = await tokenizePagarmeCard({
          number: cardNumber,
          holderName: cardHolder || customerName,
          expMonth: cardExpMonth,
          expYear: cardExpYear,
          cvv: cardCvv,
        })
      }

      const result = await createPagarmeServiceOrder({
        serviceId: offer.id,
        paymentMethod: method,
        cardToken,
        customerName: customerName.trim() || context.userName,
        customerEmail: customerEmail.trim(),
        customerDocument: docDigits,
        customerPhone: onlyDigits(customerPhone),
        reservationCode: context.reservationCode,
        propertyName: context.propertyName,
        requesterName: context.userName,
      })

      setPaymentId(result.paymentId)

      if (result.paymentStatus === 'paid' && result.serviceRequestId) {
        handlePaid(result.serviceRequestId)
        return
      }

      if (method === 'pix' && result.pix?.qrCode) {
        setPixQrCode(result.pix.qrCode)
        setPixQrCodeUrl(result.pix.qrCodeUrl)
        setStep('pix')
        return
      }

      if (method === 'credit_card') {
        if (result.card?.paid && result.serviceRequestId) {
          handlePaid(result.serviceRequestId)
          return
        }
        throw new Error(t('servicePayment.errorCardDeclined'))
      }

      throw new Error(t('servicePayment.errorCreate'))
    } catch (e) {
      const message = e instanceof Error ? e.message : t('servicePayment.errorCreate')
      setError(message)
      setStep('form')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopyPix() {
    if (!pixQrCode) return
    try {
      await navigator.clipboard.writeText(pixQrCode)
    } catch {
      /* ignore */
    }
  }

  if (!open || !offer) return null

  return (
    <div
      className="service-payment-modal__backdrop"
      role="presentation"
      onClick={() => {
        if (!submitting) onClose()
      }}
    >
      <div
        className="service-payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-payment-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="service-payment-modal__header">
          <div>
            <h2 id="service-payment-title" className="service-payment-modal__title">
              {t('servicePayment.title')}
            </h2>
            <p className="service-payment-modal__subtitle">
              {offer.name} · {formattedPrice}
            </p>
          </div>
          <button
            type="button"
            className="service-payment-modal__close"
            aria-label={t('servicePayment.close')}
            onClick={onClose}
            disabled={submitting}
          >
            ×
          </button>
        </header>

        <div className="service-payment-modal__body">
          {step === 'success' ? (
            <p className="service-payment-modal__success" role="status">
              {t('servicePayment.success')}
            </p>
          ) : null}

          {step === 'pix' ? (
            <div className="service-payment-modal__pix">
              <p>{t('servicePayment.pixInstructions')}</p>
              {pixQrCodeUrl ? (
                <img src={pixQrCodeUrl} alt={t('servicePayment.pixQrAlt')} />
              ) : null}
              {pixQrCode ? (
                <>
                  <code className="service-payment-modal__pix-code">{pixQrCode}</code>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void handleCopyPix()}>
                    {t('servicePayment.copyPix')}
                  </Button>
                </>
              ) : null}
              <p className="service-payment-modal__hint">{t('servicePayment.pixWaiting')}</p>
            </div>
          ) : null}

          {step === 'form' || step === 'processing' ? (
            <form onSubmit={(e) => void handleSubmit(e)}>
              <div className="service-payment-modal__tabs" role="tablist" aria-label={t('servicePayment.methodLabel')}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === 'pix'}
                  className={`service-payment-modal__tab ${method === 'pix' ? 'service-payment-modal__tab--active' : ''}`}
                  onClick={() => setMethod('pix')}
                  disabled={submitting}
                >
                  {t('servicePayment.methodPix')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === 'credit_card'}
                  className={`service-payment-modal__tab ${method === 'credit_card' ? 'service-payment-modal__tab--active' : ''}`}
                  onClick={() => setMethod('credit_card')}
                  disabled={submitting}
                >
                  {t('servicePayment.methodCard')}
                </button>
              </div>

              {error ? (
                <p className="service-payment-modal__error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="service-payment-modal__field">
                <label className="service-payment-modal__label" htmlFor="pay-name">
                  {t('servicePayment.fieldName')}
                </label>
                <input
                  id="pay-name"
                  className="service-payment-modal__input"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="service-payment-modal__field">
                <label className="service-payment-modal__label" htmlFor="pay-email">
                  {t('servicePayment.fieldEmail')}
                </label>
                <input
                  id="pay-email"
                  type="email"
                  className="service-payment-modal__input"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="service-payment-modal__field">
                <label className="service-payment-modal__label" htmlFor="pay-doc">
                  {t('servicePayment.fieldDocument')}
                </label>
                <input
                  id="pay-doc"
                  className="service-payment-modal__input"
                  inputMode="numeric"
                  placeholder={t('servicePayment.documentPlaceholder')}
                  value={customerDocument}
                  onChange={(e) => setCustomerDocument(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="service-payment-modal__field">
                <label className="service-payment-modal__label" htmlFor="pay-phone">
                  {t('servicePayment.fieldPhone')}
                </label>
                <input
                  id="pay-phone"
                  className="service-payment-modal__input"
                  inputMode="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {method === 'credit_card' ? (
                <>
                  <div className="service-payment-modal__field">
                    <label className="service-payment-modal__label" htmlFor="pay-card-number">
                      {t('servicePayment.fieldCardNumber')}
                    </label>
                    <input
                      id="pay-card-number"
                      className="service-payment-modal__input"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="service-payment-modal__field">
                    <label className="service-payment-modal__label" htmlFor="pay-card-holder">
                      {t('servicePayment.fieldCardHolder')}
                    </label>
                    <input
                      id="pay-card-holder"
                      className="service-payment-modal__input"
                      autoComplete="cc-name"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="service-payment-modal__row">
                    <div className="service-payment-modal__field">
                      <label className="service-payment-modal__label" htmlFor="pay-exp-month">
                        {t('servicePayment.fieldExpMonth')}
                      </label>
                      <input
                        id="pay-exp-month"
                        className="service-payment-modal__input"
                        inputMode="numeric"
                        placeholder="MM"
                        autoComplete="cc-exp-month"
                        value={cardExpMonth}
                        onChange={(e) => setCardExpMonth(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="service-payment-modal__field">
                      <label className="service-payment-modal__label" htmlFor="pay-exp-year">
                        {t('servicePayment.fieldExpYear')}
                      </label>
                      <input
                        id="pay-exp-year"
                        className="service-payment-modal__input"
                        inputMode="numeric"
                        placeholder="AA"
                        autoComplete="cc-exp-year"
                        value={cardExpYear}
                        onChange={(e) => setCardExpYear(e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <div className="service-payment-modal__field">
                    <label className="service-payment-modal__label" htmlFor="pay-cvv">
                      {t('servicePayment.fieldCvv')}
                    </label>
                    <input
                      id="pay-cvv"
                      className="service-payment-modal__input"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <p className="service-payment-modal__hint">{t('servicePayment.cardInstallmentHint')}</p>
                </>
              ) : null}

              <Button type="submit" variant="primary" fullWidth loading={submitting}>
                {method === 'pix' ? t('servicePayment.payPix') : t('servicePayment.payCard')}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
