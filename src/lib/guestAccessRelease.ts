const ACCESS_RELEASE_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const STAY_ISO_PATTERN = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

export function normalizeAccessReleaseTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return ACCESS_RELEASE_TIME_PATTERN.test(normalized) ? normalized : null
}

/** Mantém a data e o fuso do check-in da Stays, alterando apenas o horário de liberação. */
export function resolveAccessReleaseAt(
  checkInAt: string | null | undefined,
  accessReleaseTime: string | null | undefined,
): string | null {
  if (!checkInAt) return null
  const normalizedTime = normalizeAccessReleaseTime(accessReleaseTime)
  if (!normalizedTime) return checkInAt
  const match = STAY_ISO_PATTERN.exec(checkInAt)
  if (!match) return checkInAt
  return `${match[1]}T${normalizedTime}:00${match[2]}`
}
