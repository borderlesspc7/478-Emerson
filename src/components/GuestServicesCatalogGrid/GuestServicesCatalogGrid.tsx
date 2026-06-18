import { useTranslation } from 'react-i18next'
import { formatServicePrice } from '../../lib/formatServicePrice'
import type { ServiceOffer } from '../../types/guestStay'
import { Button } from '../ui/Button/Button'
import './GuestServicesCatalogGrid.css'

export type GuestServicesCatalogGridProps = {
  offers: ServiceOffer[]
  offerLoadingId?: string | null
  requestDisabled?: boolean
  onRequest: (serviceId: string) => void
  /** Número de colunas em ecrãs largos (≥900px). */
  columns?: 2 | 3
  className?: string
}

export function GuestServicesCatalogGrid({
  offers,
  offerLoadingId = null,
  requestDisabled = false,
  onRequest,
  columns = 2,
  className,
}: GuestServicesCatalogGridProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language

  const gridClass = [
    'guest-services-grid',
    columns === 3 ? 'guest-services-grid--cols-3' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <ul className={gridClass} aria-label={t('servicesPage.listAria')}>
      {offers.map((offer) => {
        const formattedPrice = formatServicePrice(locale, offer.priceInCents)
        const isLoading = offerLoadingId === offer.id
        const isDisabled = requestDisabled || (offerLoadingId !== null && !isLoading)

        return (
          <li key={offer.id} className="guest-services-grid__card">
            <h3 className="guest-services-grid__title">{offer.name}</h3>
            <p className="guest-services-grid__desc">{offer.description}</p>
            <div className="guest-services-grid__footer">
              <div className="guest-services-grid__price-wrap">
                <span className="guest-services-grid__price-label">
                  {t('servicesPage.priceLabel')}
                </span>
                <strong className="guest-services-grid__price">{formattedPrice}</strong>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                fullWidth
                loading={isLoading}
                disabled={isDisabled}
                onClick={() => onRequest(offer.id)}
              >
                {t('servicesPage.pay')}
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
