import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { isStayAccessActive } from '../../lib/auth'
import { Button } from '../../components/ui/Button/Button'
import '../../components/ui/Button/Button.css'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/path'
import './AccessExpiredPage.css'

export function AccessExpiredPage() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const s = user.stay
    if (!s?.checkInAt || !s?.checkOutAt) return
    if (isStayAccessActive(s)) return
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
        <h1 className="access-expired__title">{t('accessExpired.title')}</h1>
        <p className="access-expired__lead">{t('accessExpired.lead')}</p>
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
