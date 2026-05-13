import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiAlertTriangle, FiRefreshCw, FiShoppingBag, FiTrendingUp, FiUsers } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '../../components/ui/Button/Button'
import { useAdminAnalytics, type AdminAnalyticsPeriodId } from '../../hooks/useAdminAnalytics'
import { PATHS } from '../../routes/path'
import type { ServiceOrderCategoryKey } from '../../services/adminAnalyticsCompute'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'
import './AdminDashboardPage.css'
import './AdminDashboardPage.css'

function categoryLabel(t: (k: string) => string, key: ServiceOrderCategoryKey): string {
  return t(`adminDashboard.chartCategory.${key}`)
}

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const {
    period,
    setPeriod,
    refresh,
    refreshing,
    staysLoading,
    activeGuestsLoading,
    activeGuestsInStayWindow,
    pendingOrdersCount,
    incompleteUnitsCount,
    magicLinkUsagePercent,
    topServices,
    volumeByCategory,
    urgentOrders,
  } = useAdminAnalytics()

  const chartData = useMemo(
    () =>
      volumeByCategory.map((row) => ({
        name: categoryLabel(t, row.category),
        count: row.count,
      })),
    [volumeByCategory, t],
  )

  const periodOptions: { id: AdminAnalyticsPeriodId; labelKey: string }[] = [
    { id: 'today', labelKey: 'adminDashboard.period.today' },
    { id: 'last7', labelKey: 'adminDashboard.period.last7' },
    { id: 'thisMonth', labelKey: 'adminDashboard.period.thisMonth' },
  ]

  const pendingTone =
    pendingOrdersCount > 5 ? 'is-critical' : pendingOrdersCount > 0 ? 'is-warn' : ''

  return (
    <section className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <h3 className="guest-content__section admin-dashboard__title">{t('adminDashboard.title')}</h3>
          <p className="guest-content__lead">{t('adminDashboard.lead')}</p>
        </div>
        <div className="admin-dashboard__toolbar">
          <label className="admin-dashboard__period">
            <span className="visually-hidden">{t('adminDashboard.period.label')}</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as AdminAnalyticsPeriodId)}
              className="admin-dashboard__select"
            >
              {periodOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {t(o.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="secondary"
            loading={refreshing || staysLoading}
            onClick={() => refresh()}
            leftIcon={<FiRefreshCw aria-hidden />}
          >
            {t('adminDashboard.refresh')}
          </Button>
        </div>
      </header>

      <div className="admin-dashboard__kpi-grid">
        <Link to={PATHS.adminAccess} className="admin-dashboard__kpi admin-dashboard__kpi--link">
          <FiUsers className="admin-dashboard__kpi-icon" aria-hidden />
          <span className="admin-dashboard__kpi-label">{t('adminDashboard.kpi.guests')}</span>
          <span className="admin-dashboard__kpi-value">
            {activeGuestsLoading ? '…' : activeGuestsInStayWindow}
          </span>
          <span className="admin-dashboard__kpi-hint">{t('adminDashboard.kpi.guestsHint')}</span>
        </Link>

        <Link
          to={PATHS.adminOrders}
          className={`admin-dashboard__kpi admin-dashboard__kpi--link ${pendingTone}`}
        >
          <FiShoppingBag className="admin-dashboard__kpi-icon" aria-hidden />
          <span className="admin-dashboard__kpi-label">{t('adminDashboard.kpi.orders')}</span>
          <span className="admin-dashboard__kpi-value">{pendingOrdersCount}</span>
          <span className="admin-dashboard__kpi-hint">{t('adminDashboard.kpi.ordersHint')}</span>
        </Link>

        <Link to={PATHS.adminProperties} className="admin-dashboard__kpi admin-dashboard__kpi--link">
          <FiAlertTriangle className="admin-dashboard__kpi-icon" aria-hidden />
          <span className="admin-dashboard__kpi-label">{t('adminDashboard.kpi.quality')}</span>
          <span className="admin-dashboard__kpi-value">{incompleteUnitsCount}</span>
          <span className="admin-dashboard__kpi-hint">{t('adminDashboard.kpi.qualityHint')}</span>
        </Link>

        <div className="admin-dashboard__kpi">
          <FiTrendingUp className="admin-dashboard__kpi-icon" aria-hidden />
          <span className="admin-dashboard__kpi-label">{t('adminDashboard.kpi.magic')}</span>
          <span className="admin-dashboard__kpi-value">
            {magicLinkUsagePercent === null ? '—' : `${magicLinkUsagePercent}%`}
          </span>
          <span className="admin-dashboard__kpi-hint">{t('adminDashboard.kpi.magicHint')}</span>
        </div>
      </div>

      {topServices.length > 0 ? (
        <div className="admin-dashboard__top-services">
          <h4 className="guest-content__section admin-dashboard__subsection">
            {t('adminDashboard.topServicesTitle')}
          </h4>
          <ol className="admin-dashboard__top-services-list">
            {topServices.map((row, idx) => (
              <li key={`${row.serviceName}-${idx}`}>
                <span className="admin-dashboard__top-rank">{idx + 1}.</span>
                <span className="admin-dashboard__top-name">{row.serviceName}</span>
                <span className="admin-dashboard__top-count">{row.count}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="admin-dashboard__split">
        <div className="admin-dashboard__chart-card">
          <h4 className="guest-content__section admin-dashboard__subsection">
            {t('adminDashboard.chartTitle')}
          </h4>
          <p className="guest-content__card-meta admin-dashboard__chart-meta">
            {t('adminDashboard.chartSubtitle')}
          </p>
          <div className="admin-dashboard__chart-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="admin-dashboard__chart-grid" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} width={36} />
                <Tooltip
                  formatter={(value) => [
                    typeof value === 'number' ? value : Number(value) || 0,
                    t('adminDashboard.chartTooltipCount'),
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="count" fill="var(--color-primary, #6366f1)" radius={[4, 4, 0, 0]} name={t('adminDashboard.chartSeries')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-dashboard__urgent-card">
          <h4 className="guest-content__section admin-dashboard__subsection">
            {t('adminDashboard.urgentTitle')}
          </h4>
          <p className="guest-content__card-meta">{t('adminDashboard.urgentLead')}</p>
          {urgentOrders.length === 0 ? (
            <p className="guest-content__card-meta">{t('adminDashboard.urgentEmpty')}</p>
          ) : (
            <ul className="admin-dashboard__urgent-list">
              {urgentOrders.map((row) => (
                <li key={row.id} className="admin-dashboard__urgent-row">
                  <Link to={PATHS.adminOrders} className="admin-dashboard__urgent-link">
                    <span className="admin-dashboard__urgent-service">
                      {row.serviceName ?? t('adminDashboard.unknownService')}
                    </span>
                    <span className="admin-dashboard__urgent-meta">
                      {row.propertyName ?? row.reservationCode ?? '—'}
                    </span>
                    <time className="admin-dashboard__urgent-time" dateTime={row.createdAt?.toISOString()}>
                      {row.createdAt
                        ? new Intl.DateTimeFormat(locale, {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(row.createdAt)
                        : '—'}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
