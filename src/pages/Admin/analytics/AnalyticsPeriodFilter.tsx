import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { FiRefreshCw } from 'react-icons/fi'
import { Button } from '../../../components/ui/Button/Button'
import { useAnalyticsPeriod } from '../../../contexts/AnalyticsPeriodContext'
import type { AnalyticsPeriodPresetId } from '../../../types/analytics'
import './AnalyticsPeriodFilter.css'

type Props = {
  loading?: boolean
  onRefresh?: () => void
}

export function AnalyticsPeriodFilter({ loading, onRefresh }: Props) {
  const { t } = useTranslation()
  const { period, setPreset, setCustomRange } = useAnalyticsPeriod()

  const presets: AnalyticsPeriodPresetId[] = [
    'today',
    'last7',
    'last30',
    'last90',
    'thisMonth',
    'custom',
  ]

  return (
    <div className="analytics-period-filter">
      <label className="analytics-period-filter__select-wrap">
        <span className="visually-hidden">{t('adminAnalytics.period.label')}</span>
        <select
          className="analytics-period-filter__select"
          value={period.preset}
          onChange={(e) => setPreset(e.target.value as AnalyticsPeriodPresetId)}
        >
          {presets.map((id) => (
            <option key={id} value={id}>
              {t(`adminAnalytics.period.${id}`)}
            </option>
          ))}
        </select>
      </label>

      {period.preset === 'custom' ? (
        <div className="analytics-period-filter__custom">
          <input
            type="date"
            className="analytics-period-filter__date"
            value={period.customFrom ?? ''}
            onChange={(e) =>
              setCustomRange(e.target.value, period.customTo ?? format(new Date(), 'yyyy-MM-dd'))
            }
            aria-label={t('adminAnalytics.period.from')}
          />
          <span className="analytics-period-filter__sep">—</span>
          <input
            type="date"
            className="analytics-period-filter__date"
            value={period.customTo ?? ''}
            onChange={(e) =>
              setCustomRange(period.customFrom ?? format(new Date(), 'yyyy-MM-dd'), e.target.value)
            }
            aria-label={t('adminAnalytics.period.to')}
          />
        </div>
      ) : null}

      {onRefresh ? (
        <Button
          type="button"
          variant="secondary"
          loading={loading}
          onClick={onRefresh}
          leftIcon={<FiRefreshCw aria-hidden />}
        >
          {t('adminAnalytics.refresh')}
        </Button>
      ) : null}
    </div>
  )
}
