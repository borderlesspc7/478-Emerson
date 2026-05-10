import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMessageCircle } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import { useAuth } from '../../hooks/useAuth'
import '../shared/guestContent.css'
import './ExtrasPage.css'

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  const n = digitsOnly(phoneDigits)
  if (!n) return '#'
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`
}

export function ExtrasPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const reservationCode =
    user?.reservationCode?.trim() || user?.guestStay?.reservationCode?.trim() || '—'
  const propertyName =
    user?.guestStay?.property?.name?.trim() || user?.stay?.propertyName?.trim() || '—'

  const waNumber = (import.meta.env.VITE_ZEN_SUPPORT_WHATSAPP as string | undefined)?.trim() ?? ''

  const whatsappUrl = useMemo(() => {
    const msg = t('extras.zenWhatsappMessage', {
      code: reservationCode,
      property: propertyName,
    })
    return buildWhatsAppUrl(waNumber, msg)
  }, [t, reservationCode, propertyName, waNumber])

  const emergency = [
    { tel: '190', labelKey: 'extras.sos.police' as const },
    { tel: '193', labelKey: 'extras.sos.fire' as const },
    { tel: '192', labelKey: 'extras.sos.samu' as const },
  ]

  return (
    <div className="page-extras">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('extras.title')}</h2>
        <p className="guest-content__lead">{t('extras.lead')}</p>
      </header>

      <div className="page-extras__grid">
        <article className="guest-content__card page-extras__card--sos">
          <h3 className="guest-content__card-title">{t('extras.sos.title')}</h3>
          <p className="guest-content__card-meta">{t('extras.sos.lead')}</p>
          <ul className="page-extras__sos-list">
            {emergency.map((row) => (
              <li key={row.tel}>
                <span className="page-extras__sos-label">{t(row.labelKey)}</span>
                <a className="page-extras__sos-link" href={`tel:${row.tel}`}>
                  {row.tel}
                </a>
              </li>
            ))}
          </ul>
        </article>

        <article className="guest-content__card">
          <h3 className="guest-content__card-title">{t('extras.zen.title')}</h3>
          <p className="guest-content__card-meta">{t('extras.zen.lead')}</p>
          <div className="page-extras__support-actions">
            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<FiMessageCircle aria-hidden />}
              disabled={!waNumber}
              onClick={() => {
                if (whatsappUrl !== '#') {
                  window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
                }
              }}
            >
              {t('extras.zen.ctaWhatsapp')}
            </Button>
            {!waNumber ? (
              <p className="guest-content__card-meta" style={{ marginTop: '0.75rem' }}>
                {t('extras.zen.missingNumber')}
              </p>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  )
}
