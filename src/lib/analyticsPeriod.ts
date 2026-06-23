import {
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns'
import type { AnalyticsPeriodPresetId, AnalyticsPeriodState } from '../types/analytics'

export type AnalyticsDateRange = {
  from: Date
  to: Date
  label: string
}

export function formatAnalyticsDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseAnalyticsDateKey(key: string): Date | null {
  const d = parseISO(key)
  return isValid(d) ? d : null
}

export function listDateKeysInRange(from: Date, to: Date): string[] {
  const keys: string[] = []
  const cursor = startOfDay(from)
  const end = startOfDay(to)
  while (cursor.getTime() <= end.getTime()) {
    keys.push(formatAnalyticsDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

export function resolveAnalyticsPeriodRange(
  state: AnalyticsPeriodState,
  now = new Date(),
): AnalyticsDateRange {
  const to = endOfDay(now)

  if (state.preset === 'custom' && state.customFrom && state.customTo) {
    const from = startOfDay(parseISO(state.customFrom))
    const customTo = endOfDay(parseISO(state.customTo))
    if (isValid(from) && isValid(customTo) && from.getTime() <= customTo.getTime()) {
      return {
        from,
        to: customTo,
        label: `${formatAnalyticsDateKey(from)} — ${formatAnalyticsDateKey(customTo)}`,
      }
    }
  }

  let from: Date
  switch (state.preset) {
    case 'today':
      from = startOfDay(now)
      break
    case 'last7':
      from = startOfDay(subDays(now, 6))
      break
    case 'last30':
      from = startOfDay(subDays(now, 29))
      break
    case 'last90':
      from = startOfDay(subDays(now, 89))
      break
    case 'thisMonth':
      from = startOfMonth(now)
      break
    default:
      from = startOfDay(subDays(now, 6))
  }

  return {
    from,
    to,
    label: state.preset,
  }
}

export const ANALYTICS_PERIOD_PRESETS: AnalyticsPeriodPresetId[] = [
  'today',
  'last7',
  'last30',
  'last90',
  'thisMonth',
  'custom',
]

export function isDateInRange(date: Date | null, from: Date, to: Date): boolean {
  if (!date) return false
  const t = date.getTime()
  return t >= from.getTime() && t <= to.getTime()
}

export function emptyHourlyActivity(): number[] {
  return Array.from({ length: 24 }, () => 0)
}
