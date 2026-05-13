import { useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button/Button'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { useServiceRequests } from '../../hooks/useServiceRequests'
import { markServiceRequestCompletedById } from '../../services/serviceRequestsFirestore'
import type { ServiceRequestRecord } from '../../types/serviceRequest'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'

const columnHelper = createColumnHelper<ServiceRequestRecord>()

function formatPrice(cents: number, locale: string): string {
  const v = cents / 100
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(v)
}

export function AdminOrdersPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { requests, loading, error } = useServiceRequests(user?.uid, { adminView: true })
  const loc = i18n.language === 'en' ? 'en-US' : 'pt-BR'

  const columns = useMemo(
    () => [
      columnHelper.accessor('requesterName', {
        header: t('adminOrders.colGuest'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('reservationCode', {
        header: t('adminOrders.colReservation'),
        cell: (info) => info.getValue() || '—',
      }),
      columnHelper.accessor('serviceName', {
        header: t('adminOrders.colService'),
        cell: (info) => info.getValue() || info.row.original.serviceId,
      }),
      columnHelper.accessor('priceInCents', {
        header: t('adminOrders.colPrice'),
        cell: (info) => formatPrice(info.getValue(), loc),
      }),
      columnHelper.accessor('status', {
        header: t('adminOrders.colStatus'),
        cell: (info) => {
          const v = info.getValue()
          if (v === 'completed') return t('admin.status.completed')
          if (v === 'in_progress') return t('admin.status.inProgress')
          return t('admin.status.pending')
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: t('adminOrders.colActions'),
        cell: ({ row }) => {
          const r = row.original
          if (r.status === 'completed') {
            return <span className="guest-content__card-meta">—</span>
          }
          return (
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={async () => {
                try {
                  await markServiceRequestCompletedById(r.id)
                  showToast(t('adminOrders.toastCompleted'), 'success')
                } catch {
                  showToast(t('adminOrders.toastError'), 'error')
                }
              }}
            >
              {t('adminOrders.markComplete')}
            </Button>
          )
        },
      }),
    ],
    [t, loc, showToast]
  )

  // TanStack Table: API não compatível com memoização do React Compiler; uso local é seguro.
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <section>
      <h3 className="guest-content__section">{t('adminOrders.title')}</h3>
      <p className="guest-content__lead">{t('adminOrders.lead')}</p>

      {loading ? (
        <p className="guest-content__card-meta">{t('adminOrders.loading')}</p>
      ) : null}
      {error ? (
        <p className="guest-content__card-meta" style={{ color: 'var(--color-danger)' }}>
          {t('adminOrders.error')}
        </p>
      ) : null}

      {!loading && !requests.length ? (
        <p className="guest-content__card-meta">{t('adminOrders.empty')}</p>
      ) : null}

      {requests.length > 0 ? (
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
      ) : null}
    </section>
  )
}
