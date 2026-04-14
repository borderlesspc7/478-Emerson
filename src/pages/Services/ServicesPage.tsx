import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheck, FiTrash2 } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import { useAuth } from '../../hooks/useAuth'
import { useGuestStay } from '../../hooks/useGuestStay'
import { useServiceRequests } from '../../hooks/useServiceRequests'
import {
  createServiceRequest,
  deleteServiceRequest,
  markServiceRequestCompleted,
} from '../../services/serviceRequestsFirestore'
import type { ServiceOfferId } from '../../types/guestStay'
import '../shared/guestContent.css'
import './ServicesPage.css'

type ActionState =
  | { kind: 'complete'; id: string }
  | { kind: 'delete'; id: string }

function formatPrice(locale: string, valueInCents: number): string {
  const loc = locale === 'en' ? 'en-US' : 'pt-BR'
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(valueInCents / 100)
}

function formatRequestedAt(date: Date | null, locale: string): string {
  if (!date || Number.isNaN(date.getTime())) return '—'
  const loc = locale === 'en' ? 'en' : 'pt-BR'
  return new Intl.DateTimeFormat(loc, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function ServicesPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const uid = user?.uid
  const { stay, serviceOffers } = useGuestStay()
  const { requests, loading: historyLoading, error: historyError } =
    useServiceRequests(uid)

  const [offerLoadingId, setOfferLoadingId] = useState<ServiceOfferId | null>(
    null
  )
  const [actionLoading, setActionLoading] = useState<ActionState | null>(null)
  const [mutateError, setMutateError] = useState<string | null>(null)

  const locale = i18n.language
  const userName = user?.displayName || t('common.guest')
  const reservationCode =
    user?.reservationCode || stay.reservationCode || t('servicesPage.notInformed')
  const propertyName =
    user?.stay?.propertyName ||
    [stay.property.name, stay.property.unit].filter(Boolean).join(' - ')

  const pricesByServiceId = useMemo(
    () => new Map(serviceOffers.map((offer) => [offer.id, offer.priceInCents])),
    [serviceOffers]
  )

  const errorMessage = useMemo(() => {
    if (mutateError) return mutateError
    if (historyError === 'firestore/listen-failed') {
      return t('servicesPage.errorListen')
    }
    return null
  }, [mutateError, historyError, t])

  const handleRequest = useCallback(
    async (id: ServiceOfferId) => {
      if (!uid) return
      setMutateError(null)
      setOfferLoadingId(id)
      try {
        const priceInCents = pricesByServiceId.get(id) ?? 0
        await createServiceRequest(uid, id, priceInCents, {
          requesterName: userName,
          reservationCode,
          propertyName,
        })
        const serviceName = t(`servicesPage.items.${id}.title`)
        const price = formatPrice(locale, priceInCents)
        const message = t('servicesPage.whatsappMessage', {
          name: userName,
          reservationCode,
          property: propertyName,
          service: serviceName,
          price,
        })
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      } catch {
        setMutateError(t('servicesPage.errorCreate'))
      } finally {
        setOfferLoadingId(null)
      }
    },
    [uid, t, locale, pricesByServiceId, userName, reservationCode, propertyName]
  )

  const handleComplete = useCallback(
    async (requestId: string) => {
      if (!uid) return
      setMutateError(null)
      setActionLoading({ kind: 'complete', id: requestId })
      try {
        await markServiceRequestCompleted(uid, requestId)
      } catch {
        setMutateError(t('servicesPage.errorUpdate'))
      } finally {
        setActionLoading(null)
      }
    },
    [uid, t]
  )

  const handleDelete = useCallback(
    async (requestId: string) => {
      if (!uid) return
      setMutateError(null)
      setActionLoading({ kind: 'delete', id: requestId })
      try {
        await deleteServiceRequest(uid, requestId)
      } catch {
        setMutateError(t('servicesPage.errorDelete'))
      } finally {
        setActionLoading(null)
      }
    },
    [uid, t]
  )

  const historyHeadingId = 'services-history-heading'

  return (
    <div className="page-services">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('servicesPage.title')}</h2>
        <p className="guest-content__lead">{t('servicesPage.lead')}</p>
      </header>

      {errorMessage ? (
        <p className="page-services__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <section
        className="page-services__catalog"
        aria-label={t('servicesPage.sectionCatalog')}
      >
        <h3 className="guest-content__section page-services__section-title">
          {t('servicesPage.sectionCatalog')}
        </h3>
        <ul className="page-services__list" aria-label={t('servicesPage.listAria')}>
          {serviceOffers.map(({ id, priceInCents }) => {
            const formattedPrice = formatPrice(locale, priceInCents)
            return (
              <li key={id} className="page-services__row">
                <div className="page-services__body">
                  <h4 className="page-services__title">
                    {t(`servicesPage.items.${id}.title`)}
                  </h4>
                  <p className="page-services__desc">
                    {t(`servicesPage.items.${id}.description`)}
                  </p>
                </div>
                <div className="page-services__action">
                  <span className="page-services__price-label">
                    {t('servicesPage.priceLabel')}
                  </span>
                  <strong className="page-services__price-value">{formattedPrice}</strong>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    loading={offerLoadingId === id}
                    disabled={!uid || offerLoadingId !== null}
                    onClick={() => handleRequest(id)}
                  >
                    {t('servicesPage.request')}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section
        className="page-services__history-panel"
        aria-labelledby={historyHeadingId}
      >
        <div className="page-services__history-intro">
          <h3
            id={historyHeadingId}
            className="guest-content__section page-services__section-title"
          >
            {t('servicesPage.sectionHistory')}
          </h3>
          <p className="page-services__history-lead">
            {t('servicesPage.sectionHistoryLead')}
          </p>
        </div>

        {historyLoading && requests.length === 0 ? (
          <p className="page-services__history-loading">
            {t('servicesPage.historyLoading')}
          </p>
        ) : null}
        {!historyLoading && requests.length === 0 ? (
          <p className="page-services__history-empty">
            {t('servicesPage.historyEmpty')}
          </p>
        ) : null}

        {requests.length > 0 ? (
          <div
            className="page-services__history-table"
            role="table"
            aria-label={t('servicesPage.historyAria')}
          >
            <div
              className="page-services__history-row page-services__history-row--head"
              role="row"
            >
              <div className="page-services__history-cell" role="columnheader">
                {t('servicesPage.colService')}
              </div>
              <div className="page-services__history-cell" role="columnheader">
                {t('servicesPage.colStatus')}
              </div>
              <div className="page-services__history-cell" role="columnheader">
                {t('servicesPage.colDate')}
              </div>
              <div className="page-services__history-cell" role="columnheader">
                {t('servicesPage.colGuest')}
              </div>
              <div className="page-services__history-cell" role="columnheader">
                {t('servicesPage.colReservation')}
              </div>
              <div className="page-services__history-cell" role="columnheader">
                {t('servicesPage.colProperty')}
              </div>
              <div className="page-services__history-cell" role="columnheader">
                {t('servicesPage.colPrice')}
              </div>
              <div
                className="page-services__history-cell page-services__history-cell--actions"
                role="columnheader"
              >
                {t('servicesPage.colActions')}
              </div>
            </div>
            <div className="page-services__history-body" role="rowgroup">
              {requests.map((req) => {
                const isPending = req.status === 'pending'
                const title = t(`servicesPage.items.${req.serviceId}.title`)
                const requested = formatRequestedAt(req.createdAt, locale)
                const requestPrice = formatPrice(locale, req.priceInCents)
                const requestGuest = req.requesterName || userName
                const requestReservation = req.reservationCode || reservationCode
                const requestProperty = req.propertyName || propertyName
                const statusLabel = isPending
                  ? t('servicesPage.statusPending')
                  : t('servicesPage.statusCompleted')
                const completing =
                  actionLoading?.kind === 'complete' &&
                  actionLoading.id === req.id
                const deleting =
                  actionLoading?.kind === 'delete' && actionLoading.id === req.id

                return (
                  <div
                    key={req.id}
                    className="page-services__history-row"
                    role="row"
                  >
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colService')}
                    >
                      <span className="page-services__history-service">
                        {title}
                      </span>
                    </div>
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colStatus')}
                    >
                      <span
                        className={`page-services__badge ${
                          isPending
                            ? 'page-services__badge--pending'
                            : 'page-services__badge--completed'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colDate')}
                    >
                      <time
                        className="page-services__history-date"
                        dateTime={req.createdAt?.toISOString() ?? undefined}
                      >
                        {requested}
                      </time>
                    </div>
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colGuest')}
                    >
                      <span className="page-services__history-text">{requestGuest}</span>
                    </div>
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colReservation')}
                    >
                      <span className="page-services__history-text">
                        {requestReservation}
                      </span>
                    </div>
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colProperty')}
                    >
                      <span className="page-services__history-text">
                        {requestProperty}
                      </span>
                    </div>
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colPrice')}
                    >
                      <span className="page-services__history-price">{requestPrice}</span>
                    </div>
                    <div
                      className="page-services__history-cell page-services__history-cell--actions"
                      role="cell"
                      data-label={t('servicesPage.colActions')}
                    >
                      <div className="page-services__history-actions">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="page-services__icon-button"
                          aria-label={
                            isPending
                              ? t('servicesPage.markComplete')
                              : t('servicesPage.completedBadge')
                          }
                          title={
                            isPending
                              ? t('servicesPage.markComplete')
                              : t('servicesPage.completedBadge')
                          }
                          leftIcon={<FiCheck aria-hidden="true" />}
                          disabled={
                            !isPending || completing || deleting || !uid
                          }
                          loading={completing}
                          onClick={() => handleComplete(req.id)}
                        >
                          <span className="page-services__sr-only">
                            {isPending
                              ? t('servicesPage.markComplete')
                              : t('servicesPage.completedBadge')}
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          className="page-services__icon-button"
                          aria-label={t('servicesPage.deleteRequest')}
                          title={t('servicesPage.deleteRequest')}
                          leftIcon={<FiTrash2 aria-hidden="true" />}
                          disabled={completing || deleting || !uid}
                          loading={deleting}
                          onClick={() => handleDelete(req.id)}
                        >
                          <span className="page-services__sr-only">
                            {t('servicesPage.deleteRequest')}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </section>

      <p className="page-services__hint">{t('servicesPage.hint')}</p>
    </div>
  )
}
