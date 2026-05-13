import { useCallback, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { FiBell } from 'react-icons/fi'
import { Button } from '../ui/Button/Button'
import { useServiceNotifications } from '../../hooks/useServiceNotifications'
import './GuestNotificationCenter.css'

type GuestNotificationCenterProps = {
  guestUid: string
}

export function GuestNotificationCenter({ guestUid }: GuestNotificationCenterProps) {
  const { t, i18n } = useTranslation()
  const headingId = useId()
  const [open, setOpen] = useState(false)
  const { completedItems, unreadCount, markAllAsRead } = useServiceNotifications(
    guestUid,
    { enabled: true },
  )

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const formatDate = useCallback(
    (d: Date | null) => {
      if (!d || Number.isNaN(d.getTime())) return '—'
      const locale = i18n.language === 'en' ? 'en-US' : 'pt-BR'
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(d)
    },
    [i18n.language],
  )

  function handleMarkAll() {
    markAllAsRead()
  }

  const drawer =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="guest-notification-backdrop"
            role="presentation"
            onClick={close}
          >
            <aside
              className="guest-notification-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="guest-notification-panel__head">
                <h2 id={headingId} className="guest-notification-panel__title">
                  {t('guestNotifications.drawerTitle')}
                </h2>
                <button
                  type="button"
                  className="guest-notification-panel__close"
                  onClick={close}
                  aria-label={t('guestNotifications.closeDrawer')}
                >
                  ×
                </button>
              </div>
              <div className="guest-notification-panel__actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={unreadCount === 0}
                  onClick={handleMarkAll}
                >
                  {t('guestNotifications.markAllRead')}
                </Button>
              </div>
              <div className="guest-notification-panel__body">
                {completedItems.length === 0 ? (
                  <p className="guest-notification-panel__empty">
                    {t('guestNotifications.empty')}
                  </p>
                ) : (
                  <ul className="guest-notification-list">
                    {completedItems.map((item) => (
                      <li
                        key={item.id}
                        className={`guest-notification-list__item ${
                          item.read ? 'is-read' : 'is-unread'
                        }`}
                      >
                        <span className="guest-notification-list__name">
                          {item.serviceName}
                        </span>
                        <span className="guest-notification-list__meta">
                          {t('guestNotifications.statusLine', {
                            status: t('guestNotifications.statusCompleted'),
                            date: formatDate(item.completedAt),
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {drawer}
      <div className="guest-notification-bell-wrap">
        <button
          type="button"
          className="guest-notification-bell"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={t('guestNotifications.bellAria')}
        >
          <FiBell className="guest-notification-bell__icon" aria-hidden />
          {unreadCount > 0 ? (
            <span className="guest-notification-bell__badge" aria-hidden />
          ) : null}
        </button>
      </div>
    </>
  )
}
