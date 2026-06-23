import { useAnalyticsTracker } from '../../hooks/useAnalyticsTracker'

/** Regista page views e duração de sessão para hóspedes autenticados. */
export function AnalyticsTracker() {
  useAnalyticsTracker()
  return null
}
