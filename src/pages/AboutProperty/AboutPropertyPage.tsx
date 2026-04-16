import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiExternalLink } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import { useGuestStay } from '../../hooks/useGuestStay'
import '../shared/guestContent.css'
import './AboutPropertyPage.css'

function getGoogleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

const futureCardKeys = [
  'garageVideo',
  'elevators',
  'wifi',
  'appliances',
  'houseRules',
  'faq',
] as const

export function AboutPropertyPage() {
  const { t } = useTranslation()
  const { stay } = useGuestStay()
  const { property, access } = stay

  const addressFull = useMemo(
    () => [property.addressLine, property.city, property.postalCode].filter(Boolean).join(', '),
    [property.addressLine, property.city, property.postalCode]
  )

  const openMaps = () => {
    const mapsUrl = getGoogleMapsSearchUrl(addressFull)
    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="page-about-property">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('aboutProperty.title')}</h2>
        <p className="guest-content__lead">{t('aboutProperty.lead')}</p>
      </header>

      <div className="guest-content__grid">
        <article className="guest-content__card page-about-property__span-2">
          <h3 className="guest-content__card-title">{t('aboutProperty.howToArrive')}</h3>
          <p className="guest-content__card-value guest-content__card-value--sm">
            {addressFull}
          </p>
          <div className="page-about-property__actions">
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<FiExternalLink aria-hidden />}
              onClick={openMaps}
            >
              {t('aboutProperty.openMaps')}
            </Button>
          </div>
        </article>

        <article className="guest-content__card">
          <h3 className="guest-content__card-title">{t('aboutProperty.howToAccess')}</h3>
          <dl className="guest-content__dl">
            <div>
              <dt className="guest-content__dt">{t('aboutProperty.access.unitNumber')}</dt>
              <dd className="guest-content__dd">{property.unit}</dd>
            </div>
            <div>
              <dt className="guest-content__dt">{t('aboutProperty.access.floor')}</dt>
              <dd className="guest-content__dd">{access.floor || property.floor || '—'}</dd>
            </div>
            <div>
              <dt className="guest-content__dt">{t('aboutProperty.access.doorPassword')}</dt>
              <dd className="guest-content__dd">
                {access.doorPassword ? (
                  <span className="guest-content__code">{access.doorPassword}</span>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt className="guest-content__dt">{t('aboutProperty.access.garageSpot')}</dt>
              <dd className="guest-content__dd">{access.garageSpot || '—'}</dd>
            </div>
          </dl>
        </article>

        {futureCardKeys.map((cardKey) => (
          <article key={cardKey} className="guest-content__card">
            <h3 className="guest-content__card-title">
              {t(`aboutProperty.futureCards.${cardKey}`)}
            </h3>
            <div className="page-about-property__placeholder" />
          </article>
        ))}
      </div>
    </div>
  )
}
