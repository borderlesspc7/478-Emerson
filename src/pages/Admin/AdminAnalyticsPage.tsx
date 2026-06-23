import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { AnalyticsPeriodProvider } from '../../contexts/AnalyticsPeriodContext'
import { useAdvancedAnalytics } from '../../hooks/useAdvancedAnalytics'
import type { AggregatedAnalytics, PropertyRevenueRow } from '../../types/analytics'
import { AnalyticsKpiCard } from './analytics/AnalyticsKpiCard'
import { AnalyticsPeriodFilter } from './analytics/AnalyticsPeriodFilter'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'
import './AdminAnalyticsPage.css'

type TabId = 'overview' | 'revenue' | 'guests' | 'properties' | 'engagement'

const CHART_PRIMARY = 'var(--color-primary, #0d6b5c)'
const CHART_SECONDARY = 'color-mix(in srgb, var(--color-primary, #0d6b5c) 55%, #38bdf8)'

function formatBrl(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function formatPercent(value: number | null, locale: string): string {
  if (value === null) return '—'
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100)
}

function formatMinutes(value: number | null, locale: string): string {
  if (value === null) return '—'
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)
}

const propertyColumnHelper = createColumnHelper<PropertyRevenueRow>()

function PropertyRevenueTable({
  rows,
  locale,
  t,
}: {
  rows: PropertyRevenueRow[]
  locale: string
  t: TFunction
}) {
  const columns = useMemo(
    () => [
      propertyColumnHelper.accessor('propertyName', {
        header: t('adminAnalytics.table.property'),
      }),
      propertyColumnHelper.accessor('revenueCents', {
        header: t('adminAnalytics.table.revenue'),
        cell: (info) => formatBrl(info.getValue(), locale),
      }),
    ],
    [locale, t],
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (rows.length === 0) {
    return <p className="guest-content__card-meta">{t('adminAnalytics.empty')}</p>
  }

  return (
    <div className="admin-analytics__table-wrap">
      <table className="admin-analytics__table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AnalyticsTabPanels({
  tab,
  analytics,
  locale,
  t,
}: {
  tab: TabId
  analytics: AggregatedAnalytics
  locale: string
  t: TFunction
}) {
  const { revenue, guests, properties, engagement } = analytics

  if (tab === 'overview') {
    return (
      <div className="admin-analytics__grid admin-analytics__grid--4">
        <AnalyticsKpiCard
          label={t('adminAnalytics.kpi.totalRevenue')}
          value={formatBrl(revenue.totalCents, locale)}
        />
        <AnalyticsKpiCard
          label={t('adminAnalytics.kpi.conversion')}
          value={formatPercent(guests.conversionRate, locale)}
        />
        <AnalyticsKpiCard
          label={t('adminAnalytics.kpi.occupancy')}
          value={formatPercent(properties.occupancyRate, locale)}
        />
        <AnalyticsKpiCard
          label={t('adminAnalytics.kpi.pushOptIn')}
          value={formatPercent(engagement.pushOptInRate, locale)}
        />
        <div className="admin-analytics__chart-card admin-analytics__chart-card--wide">
          <h4 className="guest-content__section">{t('adminAnalytics.charts.revenueTrend')}</h4>
          <div className="admin-analytics__chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenue.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="admin-analytics__grid-stroke" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `R$${(Number(v) / 100).toFixed(0)}`} width={48} />
                <Tooltip
                  formatter={(v) => [formatBrl(Number(v), locale), t('adminAnalytics.table.revenue')]}
                />
                <Line type="monotone" dataKey="revenueCents" stroke={CHART_PRIMARY} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  if (tab === 'revenue') {
    const propertyChart = revenue.byProperty.slice(0, 8).map((r) => ({
      name: r.propertyName.length > 18 ? `${r.propertyName.slice(0, 16)}…` : r.propertyName,
      revenueCents: r.revenueCents,
    }))

    return (
      <>
        <div className="admin-analytics__grid admin-analytics__grid--3">
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.totalRevenue')}
            value={formatBrl(revenue.totalCents, locale)}
          />
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.avgTicket')}
            value={formatBrl(revenue.avgTicketCents, locale)}
            hint={t('adminAnalytics.kpi.avgTicketHint')}
          />
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.monthProjection')}
            value={formatBrl(revenue.monthlyProjectionCents, locale)}
            hint={t('adminAnalytics.kpi.monthProjectionHint')}
          />
        </div>
        <div className="admin-analytics__split">
          <div className="admin-analytics__chart-card">
            <h4 className="guest-content__section">{t('adminAnalytics.charts.revenueByProperty')}</h4>
            <div className="admin-analytics__chart-wrap admin-analytics__chart-wrap--tall">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={propertyChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="admin-analytics__grid-stroke" />
                  <XAxis type="number" tickFormatter={(v) => `R$${(Number(v) / 100).toFixed(0)}`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [formatBrl(Number(v), locale), t('adminAnalytics.table.revenue')]} />
                  <Bar dataKey="revenueCents" fill={CHART_PRIMARY} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="admin-analytics__chart-card">
            <h4 className="guest-content__section">{t('adminAnalytics.kpi.topServiceRevenue')}</h4>
            {revenue.topServiceByRevenue ? (
              <div className="admin-analytics__highlight">
                <p className="admin-analytics__highlight-name">
                  {revenue.topServiceByRevenue.serviceName}
                </p>
                <p className="admin-analytics__highlight-value">
                  {formatBrl(revenue.topServiceByRevenue.revenueCents, locale)}
                </p>
              </div>
            ) : (
              <p className="guest-content__card-meta">{t('adminAnalytics.empty')}</p>
            )}
            <h4 className="guest-content__section admin-analytics__subheading">
              {t('adminAnalytics.table.rankingTitle')}
            </h4>
            <PropertyRevenueTable rows={revenue.byProperty} locale={locale} t={t} />
          </div>
        </div>
      </>
    )
  }

  if (tab === 'guests') {
    const pageData = guests.pageViews.slice(0, 10)
    const npsData = guests.npsTrend.map((p) => ({
      date: p.date,
      nps: p.avgScore,
      reviews: p.reviewCount,
    }))

    return (
      <>
        <div className="admin-analytics__grid admin-analytics__grid--4">
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.conversion')}
            value={formatPercent(guests.conversionRate, locale)}
            hint={t('adminAnalytics.kpi.conversionHint')}
          />
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.avgSession')}
            value={
              guests.avgSessionMinutes !== null
                ? `${formatMinutes(guests.avgSessionMinutes, locale)} min`
                : '—'
            }
          />
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.returnRate')}
            value={formatPercent(guests.returnRate, locale)}
          />
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.npsMoving')}
            value={
              guests.npsMovingAvg !== null
                ? guests.npsMovingAvg.toFixed(1)
                : '—'
            }
            hint={t('adminAnalytics.kpi.npsReviews', { count: guests.npsReviewCount })}
          />
        </div>
        <div className="admin-analytics__split">
          <div className="admin-analytics__chart-card">
            <h4 className="guest-content__section">{t('adminAnalytics.charts.npsTrend')}</h4>
            <div className="admin-analytics__chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={npsData}>
                  <CartesianGrid strokeDasharray="3 3" className="admin-analytics__grid-stroke" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 10]} width={32} />
                  <Tooltip />
                  <Line type="monotone" dataKey="nps" stroke={CHART_PRIMARY} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="admin-analytics__chart-card">
            <h4 className="guest-content__section">{t('adminAnalytics.charts.topPages')}</h4>
            {pageData.length === 0 ? (
              <p className="guest-content__card-meta">{t('adminAnalytics.empty')}</p>
            ) : (
              <ul className="admin-analytics__rank-list">
                {pageData.map((row) => (
                  <li key={row.path}>
                    <span className="admin-analytics__rank-path">{row.path}</span>
                    <span className="admin-analytics__rank-meta">
                      {row.count} · {row.share.toFixed(1)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </>
    )
  }

  if (tab === 'properties') {
    return (
      <>
        <div className="admin-analytics__grid admin-analytics__grid--3">
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.occupancy')}
            value={formatPercent(properties.occupancyRate, locale)}
          />
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.curationComplete')}
            value={formatPercent(properties.curationCompletePercent, locale)}
            hint={t('adminAnalytics.kpi.curationHint', {
              complete: properties.curationComplete,
              total: properties.curationTotal,
            })}
          />
          <AnalyticsKpiCard
            label={t('adminAnalytics.kpi.recurringIssues')}
            value={properties.recurringIssueTags[0]?.tag ?? '—'}
            hint={
              properties.recurringIssueTags[0]
                ? `${properties.recurringIssueTags[0].count} ${t('adminAnalytics.mentions')}`
                : undefined
            }
          />
        </div>
        <div className="admin-analytics__split">
          <div className="admin-analytics__chart-card">
            <h4 className="guest-content__section">{t('adminAnalytics.charts.satisfactionRank')}</h4>
            {properties.bySatisfaction.length === 0 ? (
              <p className="guest-content__card-meta">{t('adminAnalytics.emptyReviews')}</p>
            ) : (
              <ul className="admin-analytics__rank-list">
                {properties.bySatisfaction.slice(0, 10).map((row) => (
                  <li key={row.propertyId}>
                    <span className="admin-analytics__rank-path">{row.propertyName}</span>
                    <span className="admin-analytics__rank-meta">
                      {row.avgScore.toFixed(1)} · {row.reviewCount} {t('adminAnalytics.reviews')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="admin-analytics__chart-card">
            <h4 className="guest-content__section">{t('adminAnalytics.charts.issueTags')}</h4>
            <div className="admin-analytics__chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={properties.recurringIssueTags.slice(0, 8).map((t) => ({
                    tag: t.tag,
                    count: t.count,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" className="admin-analytics__grid-stroke" />
                  <XAxis dataKey="tag" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} width={32} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <h4 className="guest-content__section admin-analytics__subheading">
              {t('adminAnalytics.charts.revenueByProperty')}
            </h4>
            <PropertyRevenueTable rows={properties.byRevenue.slice(0, 8)} locale={locale} t={t} />
          </div>
        </div>
      </>
    )
  }

  const localeChart = engagement.localeDistribution.map((l) => ({
    name: l.locale.toUpperCase(),
    count: l.count,
    share: l.share,
  }))
  const peakData = engagement.peakHours.map((h) => ({
    hour: `${String(h.hour).padStart(2, '0')}h`,
    count: h.count,
  }))

  return (
    <>
      <div className="admin-analytics__grid admin-analytics__grid--4">
        <AnalyticsKpiCard
          label={t('adminAnalytics.kpi.pwaInstall')}
          value={formatPercent(engagement.pwaInstallRate, locale)}
        />
        <AnalyticsKpiCard
          label={t('adminAnalytics.kpi.pushOptIn')}
          value={formatPercent(engagement.pushOptInRate, locale)}
        />
        <AnalyticsKpiCard
          label={t('adminAnalytics.kpi.magicLink')}
          value={formatPercent(engagement.magicLinkPercent, locale)}
        />
        <AnalyticsKpiCard
          label={t('adminAnalytics.kpi.manualLogin')}
          value={formatPercent(engagement.manualLoginPercent, locale)}
        />
      </div>
      <div className="admin-analytics__split">
        <div className="admin-analytics__chart-card">
          <h4 className="guest-content__section">{t('adminAnalytics.charts.peakHours')}</h4>
          <div className="admin-analytics__chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={peakData}>
                <CartesianGrid strokeDasharray="3 3" className="admin-analytics__grid-stroke" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                <YAxis allowDecimals={false} width={32} />
                <Tooltip />
                <Bar dataKey="count" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]}>
                  {peakData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === peakData.reduce((best, cur, idx) => (cur.count > peakData[best].count ? idx : best), 0)
                          ? CHART_PRIMARY
                          : CHART_SECONDARY
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="admin-analytics__chart-card">
          <h4 className="guest-content__section">{t('adminAnalytics.charts.locale')}</h4>
          {localeChart.length === 0 ? (
            <p className="guest-content__card-meta">{t('adminAnalytics.empty')}</p>
          ) : (
            <ul className="admin-analytics__rank-list">
              {localeChart.map((row) => (
                <li key={row.name}>
                  <span className="admin-analytics__rank-path">{row.name}</span>
                  <span className="admin-analytics__rank-meta">
                    {row.count} · {row.share.toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

function AdminAnalyticsPageInner() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const [tab, setTab] = useState<TabId>('overview')
  const { analytics, loading, error, reload, range } = useAdvancedAnalytics()

  const tabs: { id: TabId; labelKey: string }[] = [
    { id: 'overview', labelKey: 'adminAnalytics.tabs.overview' },
    { id: 'revenue', labelKey: 'adminAnalytics.tabs.revenue' },
    { id: 'guests', labelKey: 'adminAnalytics.tabs.guests' },
    { id: 'properties', labelKey: 'adminAnalytics.tabs.properties' },
    { id: 'engagement', labelKey: 'adminAnalytics.tabs.engagement' },
  ]

  return (
    <section className="admin-analytics">
      <header className="admin-analytics__header">
        <div>
          <h3 className="guest-content__section admin-analytics__title">{t('adminAnalytics.title')}</h3>
          <p className="guest-content__lead">{t('adminAnalytics.lead')}</p>
          {analytics.hasLiveFallback ? (
            <p className="guest-content__card-meta admin-analytics__meta">
              {t('adminAnalytics.liveFallback', { count: analytics.snapshotCount })}
            </p>
          ) : analytics.snapshotCount > 0 ? (
            <p className="guest-content__card-meta admin-analytics__meta">
              {t('adminAnalytics.snapshots', { count: analytics.snapshotCount, range: range.label })}
            </p>
          ) : null}
        </div>
        <AnalyticsPeriodFilter loading={loading} onRefresh={() => void reload()} />
      </header>

      {error ? <p className="admin-analytics__error">{error}</p> : null}

      <div className="admin-analytics__tabs" role="tablist" aria-label={t('adminAnalytics.tabs.aria')}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`admin-analytics__tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-analytics__loading" role="status">
          <span className="app-shell-loading__spinner" aria-hidden />
          <span>{t('common.loadingSession')}</span>
        </div>
      ) : (
        <AnalyticsTabPanels tab={tab} analytics={analytics} locale={locale} t={t} />
      )}
    </section>
  )
}

export function AdminAnalyticsPage() {
  return (
    <AnalyticsPeriodProvider>
      <AdminAnalyticsPageInner />
    </AnalyticsPeriodProvider>
  )
}
