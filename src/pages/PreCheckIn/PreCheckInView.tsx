import { useCallback, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { FiExternalLink } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { GuestServicesCatalogGrid } from '../../components/GuestServicesCatalogGrid/GuestServicesCatalogGrid'
import { Button } from '../../components/ui/Button/Button'
import { formatServicePrice } from '../../lib/formatServicePrice'
import { pickGuestPropertyImageUrl } from '../../lib/guestPropertyImage'
import { formatStayDateTime } from '../../lib/formatStayDates'
import { buildWhatsappRequestUrl } from '../../lib/whatsappUrl'
import { PATHS } from '../../routes/path'
import { createServiceRequest } from '../../services/serviceRequestsFirestore'
import type { GuestStay, ServiceOffer } from '../../types/guestStay'
import '../shared/guestContent.css'
import './PreCheckInPage.css'

function getGoogleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export type PreCheckInViewProps = {
  stay: GuestStay
  serviceOffers: ServiceOffer[]
  propertyName: string
  userName?: string
  reservationCode?: string
  /** Quando definido, permite registar pedidos no Firestore. */
  guestUid?: string | null
  catalogError?: string | null
  preview?: boolean
  onLogout?: () => void | Promise<void>
}

export function PreCheckInView({
  stay,
  serviceOffers,
  propertyName,
  userName: userNameProp,
  reservationCode: reservationCodeProp,
  guestUid,
  catalogError = null,
  preview = false,
  onLogout,
}: PreCheckInViewProps) {
  const { t, i18n } = useTranslation()
  const [offerLoadingId, setOfferLoadingId] = useState<string | null>(null)
  const [mutateError, setMutateError] = useState<string | null>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const locale = i18n.language
  const loc = locale === 'en' ? 'en' : 'pt-BR'
  const userName = userNameProp || t('common.guest')
  const reservationCode = reservationCodeProp || stay.reservationCode || t('servicesPage.notInformed')

  const addressFull = useMemo(
    () =>
      [stay.property.addressLine, stay.property.city, stay.property.postalCode]
        .filter(Boolean)
        .join(', '),
    [stay.property.addressLine, stay.property.city, stay.property.postalCode],
  )

  const propertyImageUrl = useMemo(() => pickGuestPropertyImageUrl(stay), [stay])
  const checkInLabel = formatStayDateTime(stay.checkInAt, loc)

  const errorMessage = useMemo(() => {
    if (mutateError) return mutateError
    if (catalogError === 'firestore/listen-failed') {
      return t('servicesPage.errorCatalogListen')
    }
    return null
  }, [mutateError, catalogError, t])

  const handleRequest = useCallback(
    async (serviceId: string) => {
      if (preview) {
        setMutateError(t('preCheckIn.previewRequestDisabled'))
        return
      }
      if (!guestUid) return
      setMutateError(null)
      setOfferLoadingId(serviceId)
      try {
        const offer = serviceOffers.find((o) => o.id === serviceId)
        if (!offer) return
        await createServiceRequest(guestUid, serviceId, offer.priceInCents, {
          serviceName: offer.name,
          requesterName: userName,
          reservationCode,
          propertyName,
        })
        const price = formatServicePrice(locale, offer.priceInCents)
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
    [preview, guestUid, serviceOffers, userName, reservationCode, propertyName, locale, t],
  )

  async function handleLogout() {
    if (!onLogout) return
    setLogoutLoading(true)
    try {
      await onLogout()
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <div className="page-pre-checkin">
      {preview ? (
        <p className="page-pre-checkin__preview-banner" role="status">
          {t('preCheckIn.previewBanner')}{' '}
          <Link to={PATHS.login}>{t('preCheckIn.previewBackToLogin')}</Link>
        </p>
      ) : null}

      <header className="page-pre-checkin__header">
        <p className="page-pre-checkin__brand">{t('nav.brand')}</p>
        {preview ? (
          <span className="page-pre-checkin__preview-pill">{t('preCheckIn.previewPill')}</span>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleLogout()}
            loading={logoutLoading}
          >
            {t('header.logout')}
          </Button>
        )}
      </header>

      <main className="page-pre-checkin__main" id="main-content">
        <p className="page-pre-checkin__notice" role="status">
          <Trans
            i18nKey="preCheckIn.notice"
            values={{ checkInTime: checkInLabel }}
            components={{ strong: <strong /> }}
          />
        </p>

        {propertyImageUrl ? (
          <img
            className="page-pre-checkin__hero-image"
            src={propertyImageUrl}
            alt={propertyName}
            loading="eager"
          />
        ) : (
          <div className="page-pre-checkin__hero-placeholder" aria-hidden>
            {propertyName}
          </div>
        )}

        <h1 className="page-pre-checkin__property-name">{propertyName}</h1>
        <p className="page-pre-checkin__address">{addressFull}</p>
        <div className="guest-content__actions" style={{ marginBottom: '1.75rem' }}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            leftIcon={<FiExternalLink aria-hidden />}
            onClick={() =>
              window.open(getGoogleMapsSearchUrl(addressFull), '_blank', 'noopener,noreferrer')
            }
          >
            {t('aboutProperty.openMaps')}
          </Button>
        </div>

        <section className="page-pre-checkin__services" aria-label={t('preCheckIn.servicesSection')}>
          <header className="guest-content__hero">
            <h2 className="guest-content__heading">{t('preCheckIn.servicesTitle')}</h2>
            <p className="guest-content__lead">{t('preCheckIn.servicesLead')}</p>
          </header>

          {errorMessage ? (
            <p className="page-pre-checkin__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <GuestServicesCatalogGrid
            offers={serviceOffers}
            offerLoadingId={offerLoadingId}
            requestDisabled={!preview && !guestUid}
            onRequest={(serviceId) => void handleRequest(serviceId)}
          />
        </section>
      </main>
    </div>
  )
}
