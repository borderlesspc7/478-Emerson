import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router-dom'
import { GuestServicesCatalogGrid } from '../../components/GuestServicesCatalogGrid/GuestServicesCatalogGrid'
import { useAuth } from '../../hooks/useAuth'
import { formatServicePrice } from '../../lib/formatServicePrice'
import { useGuestStay } from '../../hooks/useGuestStay'
import { useServiceRequests } from '../../hooks/useServiceRequests'
import { buildWhatsappRequestUrl } from '../../lib/whatsappUrl'
import { PATHS } from '../../routes/path'
import { createServiceRequest } from '../../services/serviceRequestsFirestore'
import '../shared/guestContent.css'
import './ServicesPage.css'

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
  const isAdmin = user?.role === 'admin'
  const { stay, serviceOffers, catalogError } = useGuestStay()
  const { requests, loading: historyLoading, error: historyError } = useServiceRequests(uid)

  const [offerLoadingId, setOfferLoadingId] = useState<string | null>(null)
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
    if (catalogError === 'firestore/listen-failed') {
      return t('servicesPage.errorCatalogListen')
    }
    return null
  }, [mutateError, historyError, catalogError, t])

  const handleRequest = useCallback(
    async (serviceId: string) => {
      if (!uid) return
      setMutateError(null)
      setOfferLoadingId(serviceId)
      try {
        const offer = serviceOffers.find((o) => o.id === serviceId)
        if (!offer) return
        const priceInCents = pricesByServiceId.get(serviceId) ?? 0
        await createServiceRequest(uid, serviceId, priceInCents, {
          serviceName: offer.name,
          requesterName: userName,
          reservationCode,
          propertyName,
        })
        const price = formatServicePrice(locale, priceInCents)
        const message = t('servicesPage.whatsappMessage', {
          name: userName,
          reservationCode,
          property: propertyName,
          service: offer.name,
          price,
        })
        const whatsappUrl = buildWhatsappRequestUrl(offer.whatsappPhone, message)
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      } catch {
        setMutateError(t('servicesPage.errorCreate'))
      } finally {
        setOfferLoadingId(null)
      }
    },
    [
      uid,
      serviceOffers,
      pricesByServiceId,
      userName,
      reservationCode,
      propertyName,
      locale,
      t,
    ]
  )

  const historyHeadingId = 'services-history-heading'

  if (isAdmin) {
    return <Navigate to={PATHS.adminServices} replace />
  }

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
        <GuestServicesCatalogGrid
          offers={serviceOffers}
          offerLoadingId={offerLoadingId}
          requestDisabled={!uid}
          columns={3}
          onRequest={(serviceId) => void handleRequest(serviceId)}
        />
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
          <p className="page-services__history-loading">{t('servicesPage.historyLoading')}</p>
        ) : null}
        {!historyLoading && requests.length === 0 ? (
          <p className="page-services__history-empty">{t('servicesPage.historyEmpty')}</p>
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
                {t('servicesPage.colReservation')}
              </div>
              <div className="page-services__history-cell" role="columnheader">
                {t('servicesPage.colProperty')}
              </div>
              <div className="page-services__history-cell" role="columnheader">
                {t('servicesPage.colPrice')}
              </div>
            </div>
            <div className="page-services__history-body" role="rowgroup">
              {requests.map((req) => {
                const isOpen = req.status !== 'completed'
                const title = req.serviceName || t('servicesPage.unknownService')
                const requested = formatRequestedAt(req.createdAt, locale)
                const requestPrice = formatServicePrice(locale, req.priceInCents)
                const requestReservation = req.reservationCode || reservationCode
                const requestProperty = req.propertyName || propertyName
                const statusLabel =
                  req.status === 'completed'
                    ? t('servicesPage.statusCompleted')
                    : req.status === 'in_progress'
                      ? t('servicesPage.statusInProgress')
                      : t('servicesPage.statusPending')

                return (
                  <div key={req.id} className="page-services__history-row" role="row">
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colService')}
                    >
                      <span className="page-services__history-service">{title}</span>
                    </div>
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colStatus')}
                    >
                      <span
                        className={`page-services__badge ${
                          isOpen
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
                      data-label={t('servicesPage.colReservation')}
                    >
                      <span className="page-services__history-text">{requestReservation}</span>
                    </div>
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colProperty')}
                    >
                      <span className="page-services__history-text">{requestProperty}</span>
                    </div>
                    <div
                      className="page-services__history-cell"
                      role="cell"
                      data-label={t('servicesPage.colPrice')}
                    >
                      <span className="page-services__history-price">{requestPrice}</span>
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
