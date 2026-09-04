import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { FiCopy } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import { useAuth } from '../../hooks/useAuth'
import { useGuestStay } from '../../hooks/useGuestStay'
import { formatPartyLine } from '../../lib/formatGuestStay'
import { formatStayDate, formatStayTime } from '../../lib/formatStayDates'
import { PATHS } from '../../routes/path'
import { sanitizePlainText } from '../../services/staysMapper'
import '../shared/guestContent.css'

type NavCardProps = {
  title: string
  onOpen: () => void
  children: React.ReactNode
}

function NavCard({ title, onOpen, children }: NavCardProps) {
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      className="guest-content__card guest-content__card--nav"
      role="link"
      tabIndex={0}
      aria-label={title}
      onClick={onOpen}
      onKeyDown={onKeyDown}
    >
      {children}
    </article>
  )
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stay } = useGuestStay()
  const loc = i18n.language === 'en' ? 'en' : 'pt-BR'

  const guestName =
    user?.displayName || user?.email?.split('@')[0] || t('common.guest')

  const { property, wifi, access, party } = stay
  const wifiSsid = sanitizePlainText(wifi.ssid) || '—'
  const wifiPassword = sanitizePlainText(wifi.password) || '—'
  const apartmentLabel =
    property.unit || property.listingCode || t('reservation.cardApartmentUnknown')
  const addressLine = [property.addressLine, property.city].filter(Boolean).join(', ')
  const [wifiCopied, setWifiCopied] = useState(false)

  async function copyWifiPassword(e?: MouseEvent) {
    e?.stopPropagation()
    if (!wifiPassword || wifiPassword === '—') return
    try {
      await navigator.clipboard.writeText(wifiPassword)
      setWifiCopied(true)
      window.setTimeout(() => setWifiCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

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
        <NavCard title={t('dashboard.cardCheckin')} onOpen={() => navigate(PATHS.reservation)}>
          <h3 className="guest-content__card-title">{t('dashboard.cardCheckin')}</h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {formatStayDate(stay.checkInAt, loc)}
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardCheckinMeta', {
              time: formatStayTime(stay.checkInAt, loc),
            })}
          </p>
        </NavCard>

        <NavCard title={t('dashboard.cardCheckout')} onOpen={() => navigate(PATHS.reservation)}>
          <h3 className="guest-content__card-title">{t('dashboard.cardCheckout')}</h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {formatStayDate(stay.checkOutAt, loc)}
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardCheckoutMeta', {
              time: formatStayTime(stay.checkOutAt, loc),
            })}
          </p>
        </NavCard>

        {party ? (
          <NavCard title={t('dashboard.cardParty')} onOpen={() => navigate(PATHS.reservation)}>
            <h3 className="guest-content__card-title">{t('dashboard.cardParty')}</h3>
            <p className="guest-content__card-value guest-content__card-value--sm">
              {formatPartyLine(party, t)}
            </p>
          </NavCard>
        ) : null}

        <NavCard title={t('dashboard.cardWifi')} onOpen={() => navigate(PATHS.reservation)}>
          <h3 className="guest-content__card-title">{t('dashboard.cardWifi')}</h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            <span className="guest-content__code">{wifiSsid}</span>
          </p>
          <p className="guest-content__card-meta">
            {t('dashboard.cardWifiMeta', { password: wifiPassword })}
          </p>
          {wifiPassword && wifiPassword !== '—' ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<FiCopy aria-hidden />}
              className="page-dashboard__copy-wifi"
              onClick={(e) => void copyWifiPassword(e)}
            >
              {wifiCopied ? t('dashboard.copyWifiPasswordDone') : t('dashboard.copyWifiPassword')}
            </Button>
          ) : null}
        </NavCard>

        <NavCard title={t('dashboard.cardAccess')} onOpen={() => navigate(PATHS.aboutProperty)}>
          <h3 className="guest-content__card-title">{t('dashboard.cardAccess')}</h3>
          <p className="guest-content__card-value guest-content__card-value--ok guest-content__card-value--sm guest-content__prose">
            {sanitizePlainText(access.summary) || t('dashboard.cardAccessOpen')}
          </p>
          <p className="guest-content__card-meta">{t('dashboard.cardAccessMeta')}</p>
        </NavCard>

        <NavCard title={t('dashboard.cardProperty')} onOpen={() => navigate(PATHS.reservation)}>
          <h3 className="guest-content__card-title">{t('dashboard.cardProperty')}</h3>
          <dl className="guest-content__stack">
            <div>
              <dt>{t('dashboard.cardPropertyName')}</dt>
              <dd>{property.name}</dd>
            </div>
            <div>
              <dt>{t('dashboard.cardPropertyAddress')}</dt>
              <dd>{addressLine || '—'}</dd>
            </div>
            <div>
              <dt>{t('dashboard.cardApartmentLabel')}</dt>
              <dd>{apartmentLabel}</dd>
            </div>
            {access.apartmentPassword ? (
              <div>
                <dt>{t('dashboard.cardApartmentPassword')}</dt>
                <dd>
                  <span className="guest-content__code">{access.apartmentPassword}</span>
                </dd>
              </div>
            ) : null}
          </dl>
        </NavCard>

        <NavCard title={t('dashboard.cardQuick')} onOpen={() => navigate(PATHS.services)}>
          <h3 className="guest-content__card-title">{t('dashboard.cardQuick')}</h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {t('dashboard.cardQuickValue')}
          </p>
          <p className="guest-content__card-meta">{t('dashboard.cardQuickMeta')}</p>
        </NavCard>

        <NavCard title={t('dashboard.cardInterests')} onOpen={() => navigate(PATHS.interests)}>
          <h3 className="guest-content__card-title">{t('dashboard.cardInterests')}</h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {t('dashboard.cardInterestsValue')}
          </p>
          <p className="guest-content__card-meta">{t('dashboard.cardInterestsMeta')}</p>
        </NavCard>

        <NavCard title={t('dashboard.cardSupport')} onOpen={() => navigate(PATHS.extras)}>
          <h3 className="guest-content__card-title">{t('dashboard.cardSupport')}</h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {t('dashboard.cardSupportValue')}
          </p>
          <p className="guest-content__card-meta">{t('dashboard.cardSupportMeta')}</p>
        </NavCard>
      </div>
    </div>
  )
}
