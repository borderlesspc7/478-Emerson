import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FiHeart, FiMapPin, FiPackage, FiSun } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import { CURITIBA_INTERESTS, type CuritibaInterest, type InterestKind } from '../../data/interestsCuritiba'
import '../shared/guestContent.css'
import './InterestsPage.css'

function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

function InterestKindIcon({ kind }: { kind: InterestKind }) {
  const iconProps = { size: 18, strokeWidth: 2 as const }
  switch (kind) {
    case 'pharmacy':
      return <FiHeart {...iconProps} aria-hidden />
    case 'grocery':
      return <FiPackage {...iconProps} aria-hidden />
    case 'park':
      return <FiSun {...iconProps} aria-hidden />
    case 'museum':
      return <FiMapPin {...iconProps} aria-hidden />
    default:
      return <FiMapPin {...iconProps} aria-hidden />
  }
}

function InterestCard({ place }: { place: CuritibaInterest }) {
  const { t } = useTranslation()
  const prefix = `interests.items.${place.id}` as const

  return (
    <article className={`guest-content__card page-interests__card`}>
      <div className="page-interests__card-head">
        <span className="page-interests__cat-icon" aria-hidden>
          <InterestKindIcon kind={place.kind} />
        </span>
        <div>
          <h3 className="page-interests__card-title">{t(`${prefix}.name`)}</h3>
          <span className="page-interests__badge">{t(`interests.kinds.${place.kind}`)}</span>
        </div>
      </div>
      <p className="page-interests__desc">{t(`${prefix}.description`)}</p>
      <p className="page-interests__meta">{t(`${prefix}.distance`)}</p>
      <div className="page-interests__cta">
        <Button
          type="button"
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => window.open(mapsSearchUrl(place.mapsQuery), '_blank', 'noopener,noreferrer')}
        >
          {t('interests.ctaMaps')}
        </Button>
      </div>
    </article>
  )
}

export function InterestsPage() {
  const { t } = useTranslation()

  const { essential, leisure } = useMemo(() => {
    const essential = CURITIBA_INTERESTS.filter((p) => p.category === 'essential')
    const leisure = CURITIBA_INTERESTS.filter((p) => p.category === 'leisure')
    return { essential, leisure }
  }, [])

  return (
    <div className="page-interests">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('interests.title')}</h2>
        <p className="guest-content__lead">{t('interests.lead')}</p>
      </header>

      <h3 className="page-interests__section-title">{t('interests.sectionEssential')}</h3>
      <div className="page-interests__grid">
        {essential.map((place) => (
          <InterestCard key={place.id} place={place} />
        ))}
      </div>

      <h3 className="page-interests__section-title">{t('interests.sectionLeisure')}</h3>
      <div className="page-interests__grid">
        {leisure.map((place) => (
          <InterestCard key={place.id} place={place} />
        ))}
      </div>
    </div>
  )
}
