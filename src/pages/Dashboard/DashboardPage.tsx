import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button/Button'
import { useAuth } from '../../hooks/useAuth'
import './DashboardPage.css'

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const guestName =
    user?.displayName || user?.email?.split('@')[0] || t('common.guest')

  return (
    <div className="page-dashboard">
      <section className="page-dashboard__hero">
        <h2 className="page-dashboard__heading">
          {t('dashboard.greeting', { name: guestName })}
        </h2>
        <p className="page-dashboard__lead">{t('dashboard.lead')}</p>
        <div className="page-dashboard__actions">
          <Button variant="primary" size="md">
            {t('dashboard.ctaReservation')}
          </Button>
          <Button variant="secondary" size="md">
            {t('dashboard.ctaService')}
          </Button>
        </div>
      </section>

      <div className="page-dashboard__grid">
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">
            {t('dashboard.cardCheckin')}
          </h3>
          <p className="page-dashboard__card-value">
            {t('dashboard.cardCheckinValue')}
          </p>
          <p className="page-dashboard__card-meta">
            {t('dashboard.cardCheckinMeta')}
          </p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">{t('dashboard.cardWifi')}</h3>
          <p className="page-dashboard__card-value">
            {t('dashboard.cardWifiValue')}
          </p>
          <p className="page-dashboard__card-meta">
            {t('dashboard.cardWifiMeta')}
          </p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">
            {t('dashboard.cardAccess')}
          </h3>
          <p className="page-dashboard__card-value page-dashboard__ok">
            {t('dashboard.cardAccessValue')}
          </p>
          <p className="page-dashboard__card-meta">
            {t('dashboard.cardAccessMeta')}
          </p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">
            {t('dashboard.cardProperty')}
          </h3>
          <p className="page-dashboard__card-value">
            {t('dashboard.cardPropertyValue')}
          </p>
          <p className="page-dashboard__card-meta">
            {t('dashboard.cardPropertyMeta')}
          </p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">{t('dashboard.cardQuick')}</h3>
          <p className="page-dashboard__card-value">
            {t('dashboard.cardQuickValue')}
          </p>
          <p className="page-dashboard__card-meta">
            {t('dashboard.cardQuickMeta')}
          </p>
        </article>
        <article className="page-dashboard__card">
          <h3 className="page-dashboard__card-title">
            {t('dashboard.cardSupport')}
          </h3>
          <p className="page-dashboard__card-value">
            {t('dashboard.cardSupportValue')}
          </p>
          <p className="page-dashboard__card-meta">
            {t('dashboard.cardSupportMeta')}
          </p>
        </article>
      </div>
    </div>
  )
}
