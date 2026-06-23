import type { ReactNode } from 'react'
import './AnalyticsKpiCard.css'

type Props = {
  label: string
  value: ReactNode
  hint?: string
}

export function AnalyticsKpiCard({ label, value, hint }: Props) {
  return (
    <div className="analytics-kpi">
      <span className="analytics-kpi__label">{label}</span>
      <span className="analytics-kpi__value">{value}</span>
      {hint ? <span className="analytics-kpi__hint">{hint}</span> : null}
    </div>
  )
}
