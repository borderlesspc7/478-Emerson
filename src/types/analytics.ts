/** Evento bruto na coleção `analyticsEvents`. */
export type AnalyticsEventType =
  | 'page_view'
  | 'session_end'
  | 'pwa_install'
  | 'login_magic'
  | 'login_manual'
  | 'locale_set'

export type AnalyticsEventRecord = {
  id: string
  userId: string
  type: AnalyticsEventType
  path?: string | null
  locale?: string | null
  durationMinutes?: number | null
  propertyId?: string | null
  reservationCode?: string | null
  createdAt: Date | null
}

/** Avaliação NPS do hóspede (`guestReviews`). */
export type GuestReviewRecord = {
  id: string
  userId: string
  reservationCode: string
  propertyId: string
  propertyName: string | null
  score: number
  tags: string[]
  comment?: string | null
  createdAt: Date | null
}

export type AnalyticsPeriodPresetId =
  | 'today'
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisMonth'
  | 'custom'

export type AnalyticsPeriodState = {
  preset: AnalyticsPeriodPresetId
  customFrom: string | null
  customTo: string | null
}

export type PropertyRevenueRow = {
  propertyId: string
  propertyName: string
  revenueCents: number
}

export type ServiceRevenueRow = {
  serviceId: string
  serviceName: string
  revenueCents: number
}

export type PageViewRow = {
  path: string
  count: number
  share: number
}

export type PropertySatisfactionRow = {
  propertyId: string
  propertyName: string
  avgScore: number
  reviewCount: number
}

export type RecurringIssueTagRow = {
  tag: string
  count: number
}

export type LocaleDistributionRow = {
  locale: string
  count: number
  share: number
}

export type HourlyActivityRow = {
  hour: number
  count: number
}

export type NpsTrendPoint = {
  date: string
  avgScore: number | null
  reviewCount: number
}

/** Snapshot diário gerado pela Cloud Function (`analyticsSnapshots/{YYYY-MM-DD}`). */
export type AnalyticsSnapshot = {
  date: string
  generatedAt: Date | null
  revenue: {
    totalCents: number
    orderCount: number
    reservationsWithPurchaseCount: number
    byProperty: PropertyRevenueRow[]
    byService: ServiceRevenueRow[]
  }
  guests: {
    accessCount: number
    purchaseCount: number
    sessionCount: number
    totalSessionMinutes: number
    pageViews: Record<string, number>
    returningGuestCount: number
    uniqueGuestCount: number
    npsSum: number
    npsCount: number
  }
  properties: {
    occupancyRate: number | null
    occupancyBooked: number
    occupancyTotal: number
    reviewTags: Record<string, number>
    curationComplete: number
    curationTotal: number
    bySatisfaction: PropertySatisfactionRow[]
    byRevenue: PropertyRevenueRow[]
  }
  engagement: {
    pwaInstalls: number
    pwaSessions: number
    pushOptIns: number
    pushEligible: number
    magicLinkLogins: number
    manualLogins: number
    localeCounts: Record<string, number>
    hourlyActivity: number[]
  }
}

/** Métricas agregadas para o período selecionado (UI). */
export type AggregatedAnalytics = {
  revenue: {
    totalCents: number
    avgTicketCents: number
    reservationsWithPurchaseCount: number
    byProperty: PropertyRevenueRow[]
    topServiceByRevenue: ServiceRevenueRow | null
    monthlyProjectionCents: number
    dailyTrend: { date: string; revenueCents: number }[]
  }
  guests: {
    conversionRate: number | null
    avgSessionMinutes: number | null
    pageViews: PageViewRow[]
    returnRate: number | null
    npsTrend: NpsTrendPoint[]
    npsMovingAvg: number | null
    npsReviewCount: number
  }
  properties: {
    bySatisfaction: PropertySatisfactionRow[]
    byRevenue: PropertyRevenueRow[]
    occupancyRate: number | null
    recurringIssueTags: RecurringIssueTagRow[]
    curationCompletePercent: number | null
    curationComplete: number
    curationTotal: number
  }
  engagement: {
    pwaInstallRate: number | null
    pushOptInRate: number | null
    magicLinkPercent: number | null
    manualLoginPercent: number | null
    localeDistribution: LocaleDistributionRow[]
    peakHours: HourlyActivityRow[]
  }
  snapshotCount: number
  hasLiveFallback: boolean
}
