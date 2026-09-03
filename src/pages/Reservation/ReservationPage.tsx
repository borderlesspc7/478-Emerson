import { useState } from 'react'
import { FiCheck, FiCopy } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button/Button'
import { useGuestStay } from '../../hooks/useGuestStay'
import { formatPartyLine } from '../../lib/formatGuestStay'
import { formatStayDate, formatStayTime } from '../../lib/formatStayDates'
import { deriveApartmentNumber } from '../../lib/guestApartment'
import '../shared/guestContent.css'
import './ReservationPage.css'

export function ReservationPage() {
  const { t, i18n } = useTranslation()
  const { stay } = useGuestStay()
  const [addressCopied, setAddressCopied] = useState(false)
  const loc = i18n.language === 'en' ? 'en' : 'pt-BR'
  const { property, access, wifi, party } = stay
  const apartmentNumber = deriveApartmentNumber(property.listingCode)

  const addressFull = [property.addressLine, property.city, property.postalCode]
    .filter(Boolean)
    .join(' · ')

  async function copyAddress() {
    if (!addressFull) return
    try {
      await navigator.clipboard.writeText(addressFull)
      setAddressCopied(true)
      window.setTimeout(() => setAddressCopied(false), 2000)
    } catch {
      setAddressCopied(false)
    }
  }

  return (
    <div className="page-reservation">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('reservation.title')}</h2>
        <p className="guest-content__lead">{t('reservation.lead')}</p>
      </header>

      <h3 className="guest-content__section">{t('reservation.sectionStay')}</h3>
      <div className="guest-content__grid">
        <article className="guest-content__card">
          <h4 className="guest-content__card-title">
            {t('reservation.cardCode')}
          </h4>
          <p className="guest-content__card-value guest-content__card-value--sm">
            <span className="guest-content__code">{stay.reservationCode}</span>
          </p>
        </article>

        <article className="guest-content__card">
          <h4 className="guest-content__card-title">
            {t('reservation.cardProperty')}
          </h4>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {property.name}
          </p>
          {property.buildingName ? (
            <p className="guest-content__card-meta">
              {t('reservation.cardBuilding')}: {property.buildingName}
            </p>
          ) : null}
          <p className="guest-content__card-meta">
            {t('reservation.cardApartmentLabel')}{' '}
            {apartmentNumber || t('reservation.cardApartmentUnknown')}
          </p>
          {access.apartmentPassword ? (
            <p className="guest-content__card-meta">
              {t('reservation.cardApartmentPassword')}:{' '}
              <span className="guest-content__code">{access.apartmentPassword}</span>
            </p>
          ) : null}
        </article>

        <article className="guest-content__card page-reservation__span-2">
          <h4 className="guest-content__card-title">
            {t('reservation.cardAddress')}
          </h4>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {addressFull}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="page-reservation__copy-address"
            leftIcon={addressCopied ? <FiCheck aria-hidden /> : <FiCopy aria-hidden />}
            onClick={() => void copyAddress()}
          >
            {t(addressCopied ? 'reservation.addressCopied' : 'reservation.copyAddress')}
          </Button>
        </article>

        <article className="guest-content__card">
          <h4 className="guest-content__card-title">
            {t('reservation.cardCheckIn')}
          </h4>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {formatStayDate(stay.checkInAt, loc)}
          </p>
          <p className="guest-content__card-meta">
            {formatStayTime(stay.checkInAt, loc)}
          </p>
        </article>

        <article className="guest-content__card">
          <h4 className="guest-content__card-title">
            {t('reservation.cardCheckOut')}
          </h4>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {formatStayDate(stay.checkOutAt, loc)}
          </p>
          <p className="guest-content__card-meta">
            {formatStayTime(stay.checkOutAt, loc)}
          </p>
        </article>
      </div>

      {party ? (
        <>
          <h3 className="guest-content__section">
            {t('reservation.sectionBooking')}
          </h3>
          <div className="guest-content__grid">
            <article className="guest-content__card">
              <h4 className="guest-content__card-title">
                {t('reservation.cardParty')}
              </h4>
              <p className="guest-content__card-value guest-content__card-value--sm">
                {formatPartyLine(party, t)}
              </p>
            </article>
          </div>
        </>
      ) : null}

      <h3 className="guest-content__section">{t('reservation.sectionWifi')}</h3>
      <div className="guest-content__grid">
        <article className="guest-content__card">
          <h4 className="guest-content__card-title">{t('reservation.wifiSsid')}</h4>
          <p className="guest-content__card-value guest-content__card-value--sm">
            <span className="guest-content__code">{wifi.ssid}</span>
          </p>
        </article>
        <article className="guest-content__card">
          <h4 className="guest-content__card-title">
            {t('reservation.wifiPassword')}
          </h4>
          <p className="guest-content__card-value guest-content__card-value--sm">
            <span className="guest-content__code">{wifi.password}</span>
          </p>
        </article>
      </div>

    </div>
  )
}
