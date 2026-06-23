import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AnalyticsPeriodPresetId, AnalyticsPeriodState } from '../types/analytics'

type AnalyticsPeriodContextValue = {
  period: AnalyticsPeriodState
  setPreset: (preset: AnalyticsPeriodPresetId) => void
  setCustomRange: (from: string, to: string) => void
}

const defaultState: AnalyticsPeriodState = {
  preset: 'last7',
  customFrom: null,
  customTo: null,
}

const AnalyticsPeriodContext = createContext<AnalyticsPeriodContextValue | null>(null)

export function AnalyticsPeriodProvider({ children }: { children: ReactNode }) {
  const [period, setPeriod] = useState<AnalyticsPeriodState>(defaultState)

  const setPreset = useCallback((preset: AnalyticsPeriodPresetId) => {
    setPeriod((prev) => ({
      ...prev,
      preset,
      ...(preset !== 'custom' ? { customFrom: null, customTo: null } : {}),
    }))
  }, [])

  const setCustomRange = useCallback((from: string, to: string) => {
    setPeriod({ preset: 'custom', customFrom: from, customTo: to })
  }, [])

  const value = useMemo(
    () => ({ period, setPreset, setCustomRange }),
    [period, setPreset, setCustomRange],
  )

  return (
    <AnalyticsPeriodContext.Provider value={value}>{children}</AnalyticsPeriodContext.Provider>
  )
}

export function useAnalyticsPeriod(): AnalyticsPeriodContextValue {
  const ctx = useContext(AnalyticsPeriodContext)
  if (!ctx) {
    throw new Error('useAnalyticsPeriod must be used within AnalyticsPeriodProvider')
  }
  return ctx
}
