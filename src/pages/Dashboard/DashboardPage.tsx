import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button'
import { useAuth } from '../../hooks/useAuth'
import { useGuestStay } from '../../hooks/useGuestStay'
import { formatPartyLine } from '../../lib/formatGuestStay'
import { formatStayDate, formatStayTime } from '../../lib/formatStayDates'
import { PATHS } from '../../routes/path'
import '../shared/guestContent.css'

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stay } = useGuestStay()
  const loc = i18n.language === 'en' ? 'en' : 'pt-BR'

  const guestName =
    user?.displayName || user?.email?.split('@')[0] || t('common.guest')

  const { property, wifi, access, party } = stay

  return (
    <div className="page-dashboard">
      <section className="guest-content__hero">
        <h2 className="guest-content__heading">
          {t('dashboard.greeting', { name: guestName })}
        </h2>
        <p className="guest-content__lead">{t('dashboard.lead')}</p>
        <div className="guest-content__actions">
          <Button
            variant="primary"
            size="md"
            type="button"
            onClick={() => navigate(PATHS.reservation)}
          >
            {t('dashboard.ctaReservation')}
          </Button>
          <Button
            variant="secondary"
            size="md"
            type="button"
            onClick={() => navigate(PATHS.services)}
          >
            {t('dashboard.ctaService')}
          </Button>
        </div>
      </section>

      <div className="guest-content__grid">
        <article className="guest-content__card">
          <h3 className="guest-content__card-title">
            {t('dashboard.cardCheckin')}
          </h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {formatStayDate(stay.checkInAt, loc)}
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardCheckinMeta', {
              time: formatStayTime(stay.checkInAt, loc),
            })}
          </p>
        </article>

        <article className="guest-content__card">
          <h3 className="guest-content__card-title">
            {t('dashboard.cardCheckout')}
          </h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {formatStayDate(stay.checkOutAt, loc)}
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardCheckoutMeta', {
              time: formatStayTime(stay.checkOutAt, loc),
            })}
          </p>
        </article>

        {party ? (
          <article className="guest-content__card">
            <h3 className="guest-content__card-title">{t('dashboard.cardParty')}</h3>
            <p className="guest-content__card-value guest-content__card-value--sm">
              {formatPartyLine(party, t)}
            </p>
          </article>
        ) : null}

        <article className="guest-content__card">
          <h3 className="guest-content__card-title">{t('dashboard.cardWifi')}</h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            <span className="guest-content__code">{wifi.ssid}</span>
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardWifiMeta', { password: wifi.password })}
          </p>
        </article>

        <article className="guest-content__card">
          <h3 className="guest-content__card-title">{t('dashboard.cardAccess')}</h3>
          <p className="guest-content__card-value guest-content__card-value--ok guest-content__card-value--sm">
            {access.summary}
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardAccessMeta')}
          </p>
        </article>

        <article className="guest-content__card">
          <h3 className="guest-content__card-title">
            {t('dashboard.cardProperty')}
          </h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {property.name}
          </p>
          <p className="guest-content__card-meta">
            {[property.unit, property.subtype, property.floor].filter(Boolean).join(' · ')}
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardPropertyAddress')}: {property.addressLine}
            {property.city ? `, ${property.city}` : ''}
          </p>
        </article>

        <article className="guest-content__card">
          <h3 className="guest-content__card-title">{t('dashboard.cardQuick')}</h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {t('dashboard.cardQuickValue')}
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardQuickMeta')}
          </p>
        </article>

        <article className="guest-content__card">
          <h3 className="guest-content__card-title">
            {t('dashboard.cardSupport')}
          </h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {t('dashboard.cardSupportValue')}
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardSupportMeta')}
          </p>
        </article>
      </div>
    </div>
  )
}
