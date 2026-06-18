import { useCallback, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { FiCheck, FiPlay, FiRotateCcw, FiTrash2 } from 'react-icons/fi'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button/Button'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../hooks/useAuth'
import { useServiceRequests } from '../../hooks/useServiceRequests'
import {
  deleteServiceRequestById,
  markServiceRequestCompletedById,
  markServiceRequestInProgressById,
  reopenServiceRequestById,
} from '../../services/serviceRequestsFirestore'
import type { ServiceRequestRecord } from '../../types/serviceRequest'
import '../../components/AdminLayout/AdminLayout.css'
import '../shared/guestContent.css'
import './AdminOrdersPage.css'

const columnHelper = createColumnHelper<ServiceRequestRecord>()

function formatPrice(cents: number, locale: string): string {
  const v = cents / 100
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(v)
}

function statusLabel(
  status: ServiceRequestRecord['status'],
  t: (key: string) => string,
): string {
  if (status === 'completed') return t('admin.status.completed')
  if (status === 'in_progress') return t('admin.status.inProgress')
  return t('admin.status.pending')
}

type OrderActionsProps = {
  record: ServiceRequestRecord
  loading: boolean
  onInProgress: (id: string) => void
  onComplete: (id: string) => void
  onReopen: (id: string) => void
  onDelete: (id: string) => void
}

function OrderActions({
  record,
  loading,
  onInProgress,
  onComplete,
  onReopen,
  onDelete,
}: OrderActionsProps) {
  const { t } = useTranslation()
  const { status, id } = record

  return (
    <div className="admin-orders__actions">
      {status === 'pending' ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="admin-orders__action-btn"
          loading={loading}
          leftIcon={<FiPlay aria-hidden />}
          onClick={() => onInProgress(id)}
        >
          {t('adminOrders.markInProgressShort')}
        </Button>
      ) : null}

      {status === 'in_progress' ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="admin-orders__action-btn"
          loading={loading}
          leftIcon={<FiRotateCcw aria-hidden />}
          onClick={() => onReopen(id)}
        >
          {t('adminOrders.reopenShort')}
        </Button>
      ) : null}

      {status !== 'completed' ? (
        <Button
          type="button"
          size="sm"
          variant="primary"
          className="admin-orders__action-btn"
          loading={loading}
          leftIcon={<FiCheck aria-hidden />}
          onClick={() => onComplete(id)}
        >
          {t('adminOrders.markCompleteShort')}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="admin-orders__action-btn"
          loading={loading}
          leftIcon={<FiRotateCcw aria-hidden />}
          onClick={() => onReopen(id)}
        >
          {t('adminOrders.reopenShort')}
        </Button>
      )}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="admin-orders__action-btn admin-orders__action-btn--delete"
        loading={loading}
        leftIcon={<FiTrash2 aria-hidden />}
        onClick={() => onDelete(id)}
      >
        {t('adminOrders.deleteShort')}
      </Button>
    </div>
  )
}

export function AdminOrdersPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { requests, loading, error } = useServiceRequests(user?.uid, { adminView: true })
  const loc = i18n.language === 'en' ? 'en-US' : 'pt-BR'
  const [actingId, setActingId] = useState<string | null>(null)

  const handleInProgress = useCallback(
    async (requestId: string) => {
      setActingId(requestId)
      try {
        await markServiceRequestInProgressById(requestId)
        showToast(t('adminOrders.toastInProgress'), 'success')
      } catch {
        showToast(t('adminOrders.toastError'), 'error')
      } finally {
        setActingId(null)
      }
    },
    [showToast, t],
  )

  const handleComplete = useCallback(
    async (requestId: string) => {
      setActingId(requestId)
      try {
        await markServiceRequestCompletedById(requestId)
        showToast(t('adminOrders.toastCompleted'), 'success')
      } catch {
        showToast(t('adminOrders.toastError'), 'error')
      } finally {
        setActingId(null)
      }
    },
    [showToast, t],
  )

  const handleReopen = useCallback(
    async (requestId: string) => {
      setActingId(requestId)
      try {
        await reopenServiceRequestById(requestId)
        showToast(t('adminOrders.toastReopened'), 'success')
      } catch {
        showToast(t('adminOrders.toastError'), 'error')
      } finally {
        setActingId(null)
      }
    },
    [showToast, t],
  )

  const handleDelete = useCallback(
    async (requestId: string) => {
      const record = requests.find((r) => r.id === requestId)
      const guestName = record?.requesterName || t('adminOrders.unknownGuest')
      const serviceName = record?.serviceName || record?.serviceId || t('adminOrders.unknownService')

      if (!window.confirm(t('adminOrders.confirmDelete', { guestName, serviceName }))) {
        return
      }

      setActingId(requestId)
      try {
        await deleteServiceRequestById(requestId)
        showToast(t('adminOrders.toastDeleted'), 'success')
      } catch {
        showToast(t('adminOrders.toastDeleteError'), 'error')
      } finally {
        setActingId(null)
      }
    },
    [requests, showToast, t],
  )

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
      columnHelper.accessor('paymentMethod', {
        header: t('adminOrders.colPayment'),
        cell: (info) => {
          const method = info.getValue()
          if (method === 'pix') return t('adminOrders.paymentPix')
          if (method === 'credit_card') return t('adminOrders.paymentCard')
          return '—'
        },
      }),
      columnHelper.accessor('status', {
        header: t('adminOrders.colStatus'),
        cell: (info) => {
          const v = info.getValue()
          return (
            <span className={`admin-orders__status admin-orders__status--${v}`}>
              {statusLabel(v, t)}
            </span>
          )
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: t('adminOrders.colActions'),
        cell: ({ row }) => (
          <OrderActions
            record={row.original}
            loading={actingId === row.original.id}
            onInProgress={handleInProgress}
            onComplete={handleComplete}
            onReopen={handleReopen}
            onDelete={handleDelete}
          />
        ),
      }),
    ],
    [t, loc, actingId, handleInProgress, handleComplete, handleReopen, handleDelete],
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
        <div className="admin-table-wrap admin-orders-table-wrap">
          <table className="admin-table admin-orders-table">
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
                  {row.getVisibleCells().map((cell) => {
                    const header = cell.column.columnDef.header
                    const dataLabel = typeof header === 'string' ? header : ''
                    const columnId = cell.column.id

                    return (
                      <td
                        key={cell.id}
                        data-label={dataLabel}
                        className={`admin-orders-table__cell admin-orders-table__cell--${columnId}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}
