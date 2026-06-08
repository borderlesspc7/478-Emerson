import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button/Button'
import { useToast } from '../../contexts/ToastContext'
import { guestDirectEntryAbsUrl } from '../../lib/guestDirectLink'
import { pickListingCardImageUrl } from '../../lib/staysListingMedia'
import {
  renameGuestAccessLinkReservationCode,
  subscribeGuestAccessLinks,
  updateGuestAccessLinkFields,
} from '../../services/guestAccessLinkFirestore'
import { fetchListings } from '../../services/staysService'
import { subscribePropertyCurations } from '../../services/propertyCurationFirestore'
import type { GuestAccessLinkRecord } from '../../types/guestAccessLink'
import type { PropertyCurationRecord } from '../../types/propertyCuration'
import type { StaysPropertyListing } from '../../types/staysApi'
import { AdminAccessEditableField } from './AdminAccessEditableField'
import { AdminCreateAccess, type AdminPropertyPickerItem } from './AdminCreateAccess'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'
import './AdminAccessPage.css'

const columnHelper = createColumnHelper<GuestAccessLinkRecord>()

function formatGuestLastAccess(d: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d)
}

function isWithinLast24Hours(d: Date): boolean {
  return Date.now() - d.getTime() < 24 * 60 * 60 * 1000
}

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

export function AdminAccessPage() {
  const { t, i18n } = useTranslation()
  const { showToast } = useToast()
  const [links, setLinks] = useState<GuestAccessLinkRecord[]>([])
  const [listings, setListings] = useState<StaysPropertyListing[]>([])
  const [curations, setCurations] = useState<PropertyCurationRecord[]>([])
  const [loadingListings, setLoadingListings] = useState(true)
  const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'

  useEffect(() => {
    const unsub = subscribeGuestAccessLinks(setLinks)
    return () => unsub()
  }, [])

  useEffect(() => {
    ;(async () => {
      setLoadingListings(true)
      try {
        const list = await fetchListings()
        setListings(list)
      } catch {
        setListings([])
      } finally {
        setLoadingListings(false)
      }
    })()
    const unsub = subscribePropertyCurations(setCurations)
    return () => unsub()
  }, [])

  const propertyPickerItems = useMemo((): AdminPropertyPickerItem[] => {
    const byId = new Map<string, { listing?: StaysPropertyListing; curation?: PropertyCurationRecord }>()
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
      .map(([id, v]) => {
        const listing = v.listing ?? null
        const title = listing ? listingTitle(listing) : v.curation?.displayName || id
        const partnerId = listing?.id?.trim()
        const shortCode = partnerId && partnerId !== id ? partnerId : null
        return {
          propertyId: id,
          title,
          shortCode,
          imageUrl: pickListingCardImageUrl(listing),
        }
      })
      .sort((a, b) => a.title.localeCompare(b.title, locale))
  }, [listings, curations, locale])

  const handleSaveReservationCode = useCallback(
    async (currentCode: string, nextCode: string) => {
      try {
        await renameGuestAccessLinkReservationCode(currentCode, nextCode)
        showToast(t('adminAccess.editReservationSuccess'), 'success')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : ''
        if (message === 'guest-access/code-already-exists') {
          showToast(t('adminAccess.editReservationDuplicate'), 'error')
          return
        }
        showToast(t('adminAccess.editError'), 'error')
      }
    },
    [showToast, t],
  )

  const handleSavePropertyId = useCallback(
    async (reservationCode: string, propertyId: string) => {
      try {
        await updateGuestAccessLinkFields(reservationCode, { propertyId })
        showToast(t('adminAccess.editPropertySuccess'), 'success')
      } catch {
        showToast(t('adminAccess.editError'), 'error')
      }
    },
    [showToast, t],
  )

  const handleToggleActive = useCallback(
    async (reservationCode: string, accessActive: boolean) => {
      try {
        await updateGuestAccessLinkFields(reservationCode, { accessActive })
        showToast(
          accessActive ? t('adminAccess.editActiveOn') : t('adminAccess.editActiveOff'),
          'success',
        )
      } catch {
        showToast(t('adminAccess.editError'), 'error')
      }
    },
    [showToast, t],
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('reservationCode', {
        header: t('adminAccess.colReservation'),
        cell: (info) => (
          <AdminAccessEditableField
            value={info.getValue()}
            label={t('adminAccess.colReservation')}
            onSave={(next) => handleSaveReservationCode(info.getValue(), next)}
          />
        ),
      }),
      columnHelper.display({
        id: 'guestDirectLink',
        header: t('adminAccess.colDirectLink'),
        cell: ({ row }) => {
          const url = guestDirectEntryAbsUrl(row.original.reservationCode)
          return (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(url).then(
                  () => showToast(t('adminAccess.directLinkCopied'), 'success'),
                  () => showToast(t('adminAccess.directLinkCopyFailed'), 'error'),
                )
              }}
            >
              {t('adminAccess.copyDirectLink')}
            </Button>
          )
        },
      }),
      columnHelper.accessor('propertyId', {
        header: t('adminAccess.colProperty'),
        cell: (info) => (
          <AdminAccessEditableField
            value={info.getValue()}
            label={t('adminAccess.colProperty')}
            monospace
            onSave={(next) => handleSavePropertyId(info.row.original.reservationCode, next)}
          />
        ),
      }),
      columnHelper.accessor('accessActive', {
        header: t('adminAccess.colActive'),
        cell: (info) => (
          <select
            className="admin-access__active-select"
            value={info.getValue() ? 'yes' : 'no'}
            aria-label={t('adminAccess.colActive')}
            onChange={(e) => {
              void handleToggleActive(
                info.row.original.reservationCode,
                e.target.value === 'yes',
              )
            }}
          >
            <option value="yes">{t('adminAccess.yes')}</option>
            <option value="no">{t('adminAccess.no')}</option>
          </select>
        ),
      }),
      columnHelper.display({
        id: 'lastAccess',
        header: t('adminAccess.colLastAccess'),
        cell: ({ row }) => {
          const d = row.original.lastAccessAt
          if (!d || Number.isNaN(d.getTime())) {
            return (
              <span className="admin-access__last-cell">
                <span
                  className="admin-access__activity-dot admin-access__activity-dot--idle"
                  title={t('adminAccess.activityStale')}
                  aria-label={t('adminAccess.activityStale')}
                />
                <span>{t('adminAccess.neverAccessed')}</span>
              </span>
            )
          }
          const recent = isWithinLast24Hours(d)
          return (
            <span className="admin-access__last-cell">
              <span
                className={`admin-access__activity-dot ${
                  recent ? 'admin-access__activity-dot--recent' : 'admin-access__activity-dot--idle'
                }`}
                title={recent ? t('adminAccess.activityRecent') : t('adminAccess.activityStale')}
                aria-label={recent ? t('adminAccess.activityRecent') : t('adminAccess.activityStale')}
              />
              <time className="admin-access__last-time" dateTime={d.toISOString()}>
                {formatGuestLastAccess(d, locale)}
              </time>
            </span>
          )
        },
      }),
      columnHelper.accessor('deviceInfo', {
        header: t('adminAccess.colDevice'),
        cell: (info) => (
          <span className="admin-access__device-cell">{info.getValue()?.trim() || '—'}</span>
        ),
      }),
      columnHelper.accessor('accessCount', {
        header: t('adminAccess.colInteractions'),
        cell: (info) => (
          <span className="admin-access__count-cell">{info.getValue() ?? 0}</span>
        ),
      }),
      columnHelper.accessor('updatedAt', {
        header: t('adminAccess.colUpdated'),
        cell: (info) => {
          const d = info.getValue()
          return d ? d.toLocaleString(locale) : '—'
        },
      }),
    ],
    [t, locale, showToast, handleSaveReservationCode, handleSavePropertyId, handleToggleActive],
  )

  const table = useReactTable({
    data: links,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <section>
      <h3 className="guest-content__section">{t('adminAccess.title')}</h3>
      <p className="guest-content__lead">{t('adminAccess.pageLead')}</p>

      <AdminCreateAccess
        propertyPickerItems={propertyPickerItems}
        loadingProperties={loadingListings}
      />

      <h4 className="guest-content__section" style={{ marginBottom: '0.35rem' }}>
        {t('adminAccess.listTitle')}
      </h4>
      <p className="guest-content__lead">{t('adminAccess.listLead')}</p>

      {!links.length ? (
        <p className="guest-content__card-meta">{t('adminAccess.empty')}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
