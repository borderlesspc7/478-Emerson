import { useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { FiChevronDown, FiExternalLink, FiPlayCircle } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import { condoFaqKeys } from '../../data/condoContent'
import { useGuestStay } from '../../hooks/useGuestStay'
import '../shared/guestContent.css'
import './AboutPropertyPage.css'

function getGoogleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

const applianceKeys = ['fridge', 'microwave', 'stove', 'washer'] as const
const houseRuleKeys = ['quietHours', 'visitors', 'smoking', 'care'] as const

export function AboutPropertyPage() {
  const { t } = useTranslation()
  const { stay } = useGuestStay()
  const { property, access, wifi } = stay
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  const addressFull = useMemo(
    () => [property.addressLine, property.city, property.postalCode].filter(Boolean).join(', '),
    [property.addressLine, property.city, property.postalCode]
  )

  const openMaps = () => {
    const mapsUrl = getGoogleMapsSearchUrl(addressFull)
    window.open(mapsUrl, '_blank', 'noopener,noreferrer')
  }

  const openGarageVideo = () => {
    window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank', 'noopener,noreferrer')
  }

  function toggleFaq(faqKey: string) {
    setExpandedFaq((current) => (current === faqKey ? null : faqKey))
  }

  function handleCardKeyboardToggle(event: KeyboardEvent<HTMLElement>, toggle: () => void) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggle()
    }
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

        <article className="guest-content__card page-about-property__info-card">
          <h3 className="guest-content__card-title">{t('aboutProperty.cards.garageVideo.title')}</h3>
          <p className="guest-content__card-meta">{t('aboutProperty.cards.garageVideo.description')}</p>
          <div className="page-about-property__actions">
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<FiPlayCircle aria-hidden />}
              onClick={openGarageVideo}
            >
              {t('aboutProperty.cards.garageVideo.cta')}
            </Button>
          </div>
        </article>

        <article className="guest-content__card page-about-property__info-card">
          <h3 className="guest-content__card-title">{t('aboutProperty.cards.elevators.title')}</h3>
          <p className="guest-content__prose">{t('aboutProperty.cards.elevators.description')}</p>
        </article>

        <article className="guest-content__card page-about-property__info-card">
          <h3 className="guest-content__card-title">{t('aboutProperty.cards.wifi.title')}</h3>
          <dl className="guest-content__dl">
            <div>
              <dt className="guest-content__dt">{t('reservation.wifiSsid')}</dt>
              <dd className="guest-content__dd">{wifi.ssid}</dd>
            </div>
            <div>
              <dt className="guest-content__dt">{t('reservation.wifiPassword')}</dt>
              <dd className="guest-content__dd">
                <span className="guest-content__code">{wifi.password}</span>
              </dd>
            </div>
          </dl>
        </article>

        <article className="guest-content__card page-about-property__info-card">
          <h3 className="guest-content__card-title">{t('aboutProperty.cards.appliances.title')}</h3>
          <ul className="page-about-property__list">
            {applianceKeys.map((key) => (
              <li key={key} className="guest-content__prose">
                {t(`aboutProperty.cards.appliances.items.${key}`)}
              </li>
            ))}
          </ul>
        </article>

        <article className="guest-content__card page-about-property__info-card">
          <h3 className="guest-content__card-title">{t('aboutProperty.cards.houseRules.title')}</h3>
          <ul className="page-about-property__list">
            {houseRuleKeys.map((key) => (
              <li key={key} className="guest-content__prose">
                {t(`aboutProperty.cards.houseRules.items.${key}`)}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <section className="page-about-property__faq" aria-label={t('aboutProperty.faq.title')}>
        <h3 className="guest-content__section">{t('aboutProperty.faq.title')}</h3>
        <p className="guest-content__lead page-about-property__faq-lead">
          {t('aboutProperty.faq.lead')}
        </p>
        <div className="page-about-property__accordion">
          {condoFaqKeys.map((faqKey) => {
            const isOpen = expandedFaq === faqKey
            const faqPanelId = `about-faq-panel-${faqKey}`
            const faqButtonId = `about-faq-button-${faqKey}`

            return (
              <article
                key={faqKey}
                className="page-about-property__accordion-item"
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-controls={faqPanelId}
                onClick={() => toggleFaq(faqKey)}
                onKeyDown={(event) =>
                  handleCardKeyboardToggle(event, () => toggleFaq(faqKey))
                }
              >
                <div id={faqButtonId} className="page-about-property__accordion-trigger">
                  <span>{t(`condo.faq.${faqKey}.question`)}</span>
                  <FiChevronDown
                    aria-hidden
                    className={`page-about-property__chevron ${isOpen ? 'is-open' : ''}`}
                  />
                </div>
                {isOpen ? (
                  <div
                    id={faqPanelId}
                    role="region"
                    aria-labelledby={faqButtonId}
                    className="page-about-property__accordion-panel"
                  >
                    <p className="guest-content__prose">{t(`condo.faq.${faqKey}.answer`)}</p>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
