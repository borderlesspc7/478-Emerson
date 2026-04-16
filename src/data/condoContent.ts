export const condoRuleCardKeys = [
  'internalRules',
  'commonAreas',
  'wasteDisposal',
  'garageRules',
] as const

export const condoFaqKeys = [
  'quietHours',
  'pets',
  'parties',
  'poolUse',
  'gymAccess',
  'deliveries',
  'visitors',
  'barbecueBooking',
  'maintenance',
  'emergency',
] as const

export type CondoRuleCardKey = (typeof condoRuleCardKeys)[number]
export type CondoFaqKey = (typeof condoFaqKeys)[number]
