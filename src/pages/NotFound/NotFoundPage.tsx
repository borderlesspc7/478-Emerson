import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getDefaultPathForUser } from '../../lib/defaultRoute'
import { PATHS } from '../../routes/path'
import './NotFoundPage.css'

export function NotFoundPage() {
  const { t } = useTranslation()
  const { user, authReady } = useAuth()
  const homePath = user ? getDefaultPathForUser(user) : PATHS.login

  return (
    <div className="not-found-page">
      <main className="not-found-page__card">
        <p className="not-found-page__code" aria-hidden>
          404
        </p>
        <h1 className="not-found-page__title">{t('notFound.title')}</h1>
        <p className="not-found-page__text">{t('notFound.description')}</p>
        <div className="not-found-page__actions">
          {authReady ? (
            <Link to={homePath} className="not-found-page__link not-found-page__link--primary">
              {user ? t('notFound.backHome') : t('notFound.backLogin')}
            </Link>
          ) : null}
          <Link to={PATHS.login} className="not-found-page__link">
            {t('notFound.goLogin')}
          </Link>
        </div>
      </main>
    </div>
  )
}
