import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button'
import { useToast } from '../../contexts/ToastContext'
import { fetchListingById, fetchListings } from '../../services/staysService'
import {
  subscribePropertyCurations,
} from '../../services/propertyCurationFirestore'
import type { StaysPropertyListing } from '../../types/staysApi'
import type { PropertyCurationRecord } from '../../types/propertyCuration'
import { PATHS } from '../../routes/path'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'

function listingTitle(l: StaysPropertyListing): string {
  const m = l._mstitle
  if (m) {
    const txt =
      m.pt_BR ||
      m.pt_PT ||
      m.en_US ||
      Object.values(m).find((x) => typeof x === 'string' && String(x).trim())
    if (txt) return String(txt).trim().slice(0, 100)
  }
  return l.internalName?.trim() || l.id?.trim() || l._id || '—'
}

function propertyKey(l: StaysPropertyListing): string {
  return String(l._id || l.id || '').trim()
}

export function AdminPropertiesPage() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [listings, setListings] = useState<StaysPropertyListing[]>([])
  const [curations, setCurations] = useState<PropertyCurationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [importId, setImportId] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const list = await fetchListings()
        setListings(list)
      } catch {
        setListings([])
      } finally {
        setLoading(false)
      }
    })()
    const unsub = subscribePropertyCurations(setCurations, () => {
      /* silencioso */
    })
    return () => unsub()
  }, [])

  const merged = useMemo(() => {
    const byId = new Map<
      string,
      { listing?: StaysPropertyListing; curation?: PropertyCurationRecord }
    >()
    for (const l of listings) {
      const id = propertyKey(l)
      if (!id) continue
      const cur = byId.get(id) ?? {}
      cur.listing = l
      byId.set(id, cur)
    }
    for (const c of curations) {
      const cur = byId.get(c.propertyId) ?? {}
      cur.curation = c
      byId.set(c.propertyId, cur)
    }
    return Array.from(byId.entries())
  }, [listings, curations])

  async function handleImport(e: React.FormEvent) {
    e.preventDefault()
    const id = importId.trim()
    if (!id) return
    setImporting(true)
    try {
      const l = await fetchListingById(id)
      const k = propertyKey(l)
      if (!k) throw new Error('no-id')
      setListings((prev) => {
        if (prev.some((x) => propertyKey(x) === k)) return prev
        return [l, ...prev]
      })
      showToast(t('adminProperties.importOk'), 'success')
      setImportId('')
    } catch {
      showToast(t('adminProperties.importFail'), 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section>
      <h3 className="guest-content__section">{t('adminProperties.title')}</h3>
      <p className="guest-content__lead">{t('adminProperties.lead')}</p>

      <form className="admin-form" onSubmit={handleImport} style={{ marginBottom: '1.5rem' }}>
        <label>
          <span>{t('adminProperties.importLabel')}</span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              value={importId}
              onChange={(e) => setImportId(e.target.value)}
              placeholder={t('adminProperties.importPlaceholder')}
            />
            <Button type="submit" variant="secondary" loading={importing}>
              {t('adminProperties.importCta')}
            </Button>
          </div>
        </label>
      </form>

      {loading ? (
        <p className="guest-content__card-meta">{t('adminProperties.loading')}</p>
      ) : null}

      {!loading && merged.length === 0 ? (
        <p className="guest-content__card-meta">{t('adminProperties.empty')}</p>
      ) : null}

      <div className="admin-grid-cards">
        {merged.map(([id, pack]) => {
          const title = pack.listing
            ? listingTitle(pack.listing)
            : pack.curation?.displayName || id
          const hasCuration = Boolean(
            pack.curation &&
              (pack.curation.garagePhotoUrls.length > 0 ||
                Boolean(pack.curation.garageVideoUrl?.trim()) ||
                pack.curation.elevatorPhotoUrls.length > 0 ||
                pack.curation.manualAccessTips.trim() ||
                pack.curation.manualPropertyTips.trim())
          )
          return (
            <Link
              key={id}
              to={`${PATHS.adminProperties}/${encodeURIComponent(id)}`}
              className="admin-property-card"
            >
              <span className="guest-content__card-title">{title}</span>
              <span className="admin-property-card__meta">{id}</span>
              {hasCuration ? (
                <span className="guest-content__card-meta">{t('adminProperties.badgeCurated')}</span>
              ) : (
                <span className="guest-content__card-meta">{t('adminProperties.badgeStaysOnly')}</span>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
