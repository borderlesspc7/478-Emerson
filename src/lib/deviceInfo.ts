/**
 * Resumo legível do dispositivo/navegador para analytics (sem expor o userAgent completo).
 */
export function buildSimplifiedDeviceInfo(userAgent: string | undefined): string {
  const ua = (userAgent ?? '').trim()
  if (!ua) return '—'

  const isAndroid = /Android/i.test(ua)
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isWindows = /Windows NT/i.test(ua)
  const isMac = /Macintosh|Mac OS X/i.test(ua)
  const isLinux = /Linux/i.test(ua) && !isAndroid

  let os = 'Web'
  if (isIOS) os = /iPad/i.test(ua) ? 'iPad' : 'iPhone'
  else if (isAndroid) os = 'Android'
  else if (isWindows) os = 'Windows'
  else if (isMac) os = 'macOS'
  else if (isLinux) os = 'Linux'

  let browser = 'Browser'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Opera|OPR\//i.test(ua)) browser = 'Opera'

  return `${os} · ${browser}`
}
