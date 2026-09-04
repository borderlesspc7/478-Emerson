import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiHeart, FiMapPin, FiPackage, FiSun } from 'react-icons/fi'
import { Button } from '../../components/ui/Button/Button'
import type { InterestKind } from '../../data/interestsCuritiba'
import { formatDistanceLabel } from '../../lib/geo/formatDistanceLabel'
import { useNearbyInterests } from '../../hooks/useNearbyInterests'
import type { NearbyPlace } from '../../types/nearbyPlace'
import '../shared/guestContent.css'
import './InterestsPage.css'

const KIND_ORDER: InterestKind[] = ['pharmacy', 'grocery', 'park', 'museum']

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

function InterestCard({ place, isFallback }: { place: NearbyPlace; isFallback: boolean }) {
  const { t, i18n } = useTranslation()

  const distanceLabel = isFallback
    ? t(`interests.items.${place.id}.distance`, { defaultValue: '—' })
    : t('interests.distanceFromProperty', {
        distance: formatDistanceLabel(place.distanceMeters, i18n.language),
      })

  return (
    <article className="guest-content__card page-interests__card" id={`interest-${place.kind}`}>
      <div className="page-interests__card-head">
        <span className="page-interests__cat-icon" aria-hidden>
          <InterestKindIcon kind={place.kind} />
        </span>
        <div>
          <h3 className="page-interests__card-title">{place.name}</h3>
          <span className="page-interests__badge">{t(`interests.kinds.${place.kind}`)}</span>
        </div>
      </div>
      <p className="page-interests__desc">{place.description}</p>
      <p className="page-interests__meta">{distanceLabel}</p>
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

function InterestsSkeleton() {
  return (
    <div className="page-interests__grid page-interests__grid--loading" aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="page-interests__skeleton guest-content__card" />
      ))}
    </div>
  )
}

export function InterestsPage() {
  const { t } = useTranslation()
  const { essential, leisure, regionLabel, loading, error, source } = useNearbyInterests()
  const isFallback = source === 'fallback'
  const [kindFilter, setKindFilter] = useState<InterestKind | 'all'>('all')

  const filteredEssential = useMemo(
    () =>
      kindFilter === 'all' ? essential : essential.filter((p) => p.kind === kindFilter),
    [essential, kindFilter],
  )
  const filteredLeisure = useMemo(
    () => (kindFilter === 'all' ? leisure : leisure.filter((p) => p.kind === kindFilter)),
    [leisure, kindFilter],
  )

  const showEssential =
    kindFilter === 'all' || kindFilter === 'pharmacy' || kindFilter === 'grocery'
  const showLeisure =
    kindFilter === 'all' || kindFilter === 'park' || kindFilter === 'museum'

  return (
    <div className="page-interests">
      <header className="guest-content__hero">
        <h2 className="guest-content__heading">{t('interests.title')}</h2>
        <p className="guest-content__lead">
          {loading
            ? t('interests.leadLoading')
            : t('interests.leadDynamic', { region: regionLabel || t('interests.regionFallback') })}
        </p>
        {error && isFallback ? (
          <p className="page-interests__notice" role="status">
            {t(error)}
          </p>
        ) : null}
        {!loading && !isFallback ? (
          <p className="page-interests__attribution">{t('interests.osmAttribution')}</p>
        ) : null}

        <div className="page-interests__filters" role="toolbar" aria-label={t('interests.filterAria')}>
          <button
            type="button"
            className={`page-interests__filter ${kindFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setKindFilter('all')}
          >
            {t('interests.filterAll')}
          </button>
          {KIND_ORDER.map((kind) => (
            <button
              key={kind}
              type="button"
              className={`page-interests__filter ${kindFilter === kind ? 'is-active' : ''}`}
              onClick={() => setKindFilter(kind)}
              aria-pressed={kindFilter === kind}
            >
              <InterestKindIcon kind={kind} />
              <span>{t(`interests.kinds.${kind}`)}</span>
            </button>
          ))}
        </div>
      </header>

      {showEssential ? (
        <>
          <h3 className="page-interests__section-title">{t('interests.sectionEssential')}</h3>
          {loading ? (
            <InterestsSkeleton />
          ) : filteredEssential.length ? (
            <div className="page-interests__grid">
              {filteredEssential.map((place) => (
                <InterestCard key={place.id} place={place} isFallback={isFallback} />
              ))}
            </div>
          ) : (
            <p className="page-interests__notice">{t(`interests.kindDescriptions.${kindFilter}`)}</p>
          )}
        </>
      ) : null}

      {showLeisure ? (
        <>
          <h3 className="page-interests__section-title">{t('interests.sectionLeisure')}</h3>
          {loading ? (
            <InterestsSkeleton />
          ) : filteredLeisure.length ? (
            <div className="page-interests__grid">
              {filteredLeisure.map((place) => (
                <InterestCard key={place.id} place={place} isFallback={isFallback} />
              ))}
            </div>
          ) : (
            <p className="page-interests__notice">{t(`interests.kindDescriptions.${kindFilter}`)}</p>
          )}
        </>
      ) : null}
    </div>
  )
}
