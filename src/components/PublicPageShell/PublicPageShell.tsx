import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { GiLotusFlower } from 'react-icons/gi'
import { useAuth } from '../../hooks/useAuth'
import { getDefaultPathForUser } from '../../lib/defaultRoute'
import { PATHS } from '../../routes/path'
import './PublicPageShell.css'

type PublicPageShellProps = {
  children: ReactNode
}

/** Layout mínimo para páginas públicas (legal, 404) sem exigir login. */
export function PublicPageShell({ children }: PublicPageShellProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const homePath = user ? getDefaultPathForUser(user) : PATHS.login

  return (
    <div className="public-page-shell">
      <header className="public-page-shell__header">
        <Link to={homePath} className="public-page-shell__brand">
          <GiLotusFlower aria-hidden className="public-page-shell__logo" />
          <span>{t('nav.brand')}</span>
        </Link>
      </header>
      <main className="public-page-shell__main">{children}</main>
    </div>
  )
}
