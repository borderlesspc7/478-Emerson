import { useTranslation } from 'react-i18next'
import { useGuestStay } from '../../hooks/useGuestStay'
import {
  formatStayDate,
  formatStayDateTime,
  formatStayTime,
} from '../../lib/formatStayDates'
import '../shared/guestContent.css'
import './ReservationPage.css'

export function ReservationPage() {
  const { t, i18n } = useTranslation()
  const { stay } = useGuestStay()
  const loc = i18n.language === 'en' ? 'en' : 'pt-BR'
  const { property, wifi, access, notes } = stay

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
            {[property.unit, property.floor].filter(Boolean).join(' · ')}
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

      <h3 className="guest-content__section">
        {t('reservation.sectionAccess')}
      </h3>
      <div className="guest-content__grid">
        <article className="guest-content__card page-reservation__full">
          <h4 className="guest-content__card-title">
            {t('reservation.accessSummary')}
          </h4>
          <p className="guest-content__card-value guest-content__card-value--ok">
            {access.summary}
          </p>
          <p className="guest-content__card-meta guest-content__prose">
            {access.instructions}
          </p>
        </article>
      </div>

      {notes ? (
        <>
          <h3 className="guest-content__section">
            {t('reservation.sectionNotes')}
          </h3>
          <div className="guest-content__grid">
            <article className="guest-content__card page-reservation__full">
              <p className="guest-content__prose">{notes}</p>
            </article>
          </div>
        </>
      ) : null}

      <h3 className="guest-content__section">
        {t('reservation.sectionSummary')}
      </h3>
      <dl className="guest-content__dl guest-content__dl--two">
        <dt className="guest-content__dt">{t('reservation.summaryPeriod')}</dt>
        <dd className="guest-content__dd">
          {formatStayDateTime(stay.checkInAt, loc)} —{' '}
          {formatStayDateTime(stay.checkOutAt, loc)}
        </dd>
        <dt className="guest-content__dt">{t('reservation.summaryProperty')}</dt>
        <dd className="guest-content__dd">{property.name}</dd>
        <dt className="guest-content__dt">{t('reservation.summaryUnit')}</dt>
        <dd className="guest-content__dd">
          {[property.unit, property.floor].filter(Boolean).join(' · ')}
        </dd>
      </dl>
    </div>
  )
}
