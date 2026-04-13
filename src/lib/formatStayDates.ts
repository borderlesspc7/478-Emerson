const timeOpts: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
}

const dateOpts: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

export function formatStayDateTime(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { ...dateOpts, ...timeOpts }).format(
    d
  )
}

export function formatStayDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, dateOpts).format(d)
}

export function formatStayTime(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, timeOpts).format(d)
}
