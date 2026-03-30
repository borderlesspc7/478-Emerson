import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/Button/Button'
import { useAuth } from '../../hooks/useAuth'
import './AccessExpiredPage.css'

export function AccessExpiredPage() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const [loading, setLoading] = useState(false)

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
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleLogout}
          loading={loading}
        >
          {t('accessExpired.logout')}
        </Button>
      </main>
    </div>
  )
}
