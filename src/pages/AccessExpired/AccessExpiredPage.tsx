import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { isStayCheckOutExpired } from '../../lib/auth'
import {
  formatGuestStayAccessErrorMessage,
  getStayAccessDisplayError,
} from '../../lib/guestStayAccessError'
import { formatStayDateTime } from '../../lib/formatStayDates'
import { Button } from '../../components/ui/Button/Button'
import '../../components/ui/Button/Button.css'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/path'
import './AccessExpiredPage.css'

export function AccessExpiredPage() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const loc = i18n.language === 'en' ? 'en' : 'pt-BR'

  const copy = useMemo(() => {
    const stay = user?.stay
    if (stay?.checkInAt && stay?.checkOutAt) {
      const accessError = getStayAccessDisplayError({
        checkInAt: stay.checkInAt,
        checkOutAt: stay.checkOutAt,
      })
      if (accessError?.code === 'stay/check-out-expired') {
        return {
          title: t('accessExpired.afterCheckOutTitle'),
          lead: formatGuestStayAccessErrorMessage(accessError, t, i18n.language),
        }
      }
      if (accessError?.code === 'stay/before-check-in') {
        return {
          title: t('accessExpired.beforeCheckInTitle'),
          lead: formatGuestStayAccessErrorMessage(accessError, t, i18n.language),
        }
      }
    }
    return {
      title: t('accessExpired.title'),
      lead: t('accessExpired.lead'),
    }
  }, [user?.stay, t, i18n.language])

  useEffect(() => {
    if (!user) return
    const s = user.stay
    if (!s?.checkInAt || !s?.checkOutAt) return
    if (!isStayCheckOutExpired(s)) return
    void (async () => {
      try {
        window.localStorage.clear()
        window.sessionStorage.clear()
      } catch {
        /* ignore */
      }
      try {
        await logout()
      } catch {
        /* ignore */
      }
    })()
  }, [user, logout])

  async function handleLogout() {
    setLoading(true)
    try {
      await logout()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="access-expired">
      <main className="access-expired__card">
        <h1 className="access-expired__title">{copy.title}</h1>
        <p className="access-expired__lead">{copy.lead}</p>
        {user?.stay?.checkInAt && user?.stay?.checkOutAt ? (
          <p className="access-expired__meta">
            {t('accessExpired.stayWindow', {
              checkIn: formatStayDateTime(user.stay.checkInAt, loc),
              checkOut: formatStayDateTime(user.stay.checkOutAt, loc),
            })}
          </p>
        ) : null}
        {user ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleLogout}
            loading={loading}
          >
            {t('accessExpired.logout')}
          </Button>
        ) : (
          <Link className="ui-button ui-button--primary ui-button--md" to={PATHS.login}>
            {t('accessExpired.backToLogin')}
          </Link>
        )}
      </main>
    </div>
  )
}
