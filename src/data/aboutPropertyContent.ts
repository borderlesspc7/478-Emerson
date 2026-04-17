export const aboutPropertyRuleCardKeys = [
  'commonAreas',
  'wasteDisposal',
  'garageRules',
] as const

export const aboutPropertyFaqKeys = [
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

export type AboutPropertyRuleCardKey = (typeof aboutPropertyRuleCardKeys)[number]
