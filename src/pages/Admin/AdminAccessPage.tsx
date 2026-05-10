import { useEffect, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { subscribeGuestAccessLinks } from '../../services/guestAccessLinkFirestore'
import { fetchListings } from '../../services/staysService'
import { subscribePropertyCurations } from '../../services/propertyCurationFirestore'
import type { GuestAccessLinkRecord } from '../../types/guestAccessLink'
import type { PropertyCurationRecord } from '../../types/propertyCuration'
import type { StaysPropertyListing } from '../../types/staysApi'
import { AdminCreateAccess } from './AdminCreateAccess'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'

const columnHelper = createColumnHelper<GuestAccessLinkRecord>()

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

  const propertyOptions = useMemo(() => {
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
        const label = v.listing ? listingTitle(v.listing) : v.curation?.displayName || id
        return { id, label: `${label} (${id})` }
      })
      .sort((a, b) => a.label.localeCompare(b.label, locale))
  }, [listings, curations, locale])

  const columns = useMemo(
    () => [
      columnHelper.accessor('reservationCode', {
        header: t('adminAccess.colReservation'),
        cell: (info) => <span className="guest-content__code">{info.getValue()}</span>,
      }),
      columnHelper.accessor('propertyId', {
        header: t('adminAccess.colProperty'),
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('accessActive', {
        header: t('adminAccess.colActive'),
        cell: (info) => (info.getValue() ? t('adminAccess.yes') : t('adminAccess.no')),
      }),
      columnHelper.accessor('updatedAt', {
        header: t('adminAccess.colUpdated'),
        cell: (info) => {
          const d = info.getValue()
          return d ? d.toLocaleString(locale) : '—'
        },
      }),
    ],
    [t, locale]
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

      <AdminCreateAccess propertyOptions={propertyOptions} loadingOptions={loadingListings} />

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
