import { useTranslation } from 'react-i18next'
import { useGuestStay } from '../../hooks/useGuestStay'
import { formatPartyLine, formatTotalPrice } from '../../lib/formatGuestStay'
import { formatStayDate, formatStayTime } from '../../lib/formatStayDates'
import '../shared/guestContent.css'
import './ReservationPage.css'

export function ReservationPage() {
  const { t, i18n } = useTranslation()
  const { stay } = useGuestStay()
  const loc = i18n.language === 'en' ? 'en' : 'pt-BR'
  const { property, wifi, party, totalPrice } = stay

  const addressFull = [property.addressLine, property.city, property.postalCode]
    .filter(Boolean)
    .join(' · ')

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
          <p className="guest-content__card-meta">
            {t('reservation.cardCodeMeta')}
          </p>
        </article>

        <article className="guest-content__card">
          <h4 className="guest-content__card-title">
            {t('reservation.cardProperty')}
          </h4>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {property.name}
          </p>
          <p className="guest-content__card-meta">
            {[property.unit, property.subtype, property.floor].filter(Boolean).join(' · ')}
          </p>
        </article>

        <article className="guest-content__card page-reservation__span-2">
          <h4 className="guest-content__card-title">
            {t('reservation.cardAddress')}
          </h4>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {addressFull}
          </p>
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

      {party || totalPrice ? (
        <>
          <h3 className="guest-content__section">
            {t('reservation.sectionBooking')}
          </h3>
          <div className="guest-content__grid">
            {party ? (
              <article className="guest-content__card">
                <h4 className="guest-content__card-title">
                  {t('reservation.cardParty')}
                </h4>
                <p className="guest-content__card-value guest-content__card-value--sm">
                  {formatPartyLine(party, t)}
                </p>
              </article>
            ) : null}
            {totalPrice ? (
              <article className="guest-content__card">
                <h4 className="guest-content__card-title">
                  {t('reservation.cardTotal')}
                </h4>
                <p className="guest-content__card-value guest-content__card-value--sm">
                  {formatTotalPrice(totalPrice, loc)}
                </p>
              </article>
            ) : null}
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
