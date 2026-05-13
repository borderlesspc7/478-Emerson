import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/path'
import '../Login/Login.css'
import './GuestMagicLoginPage.css'

/**
 * Entrada direta: `/entrar/:reservationCode` — executa o mesmo fluxo Stays+Firebase que o login
 * do hóspede, sem mostrar o formulário, e redireciona para a página da reserva.
 */
export function GuestMagicLoginPage() {
  const { t } = useTranslation()
  const { reservationCode: rawParam } = useParams<{ reservationCode: string }>()
  const navigate = useNavigate()
  const { loginGuest, logout, user, authReady, lastError, clearError } = useAuth()
  const started = useRef(false)

  useEffect(() => {
    if (!user) started.current = false
  }, [user])

  useEffect(() => {
    clearError()
  }, [rawParam, clearError])

  useEffect(() => {
    if (!authReady) return
    if (user?.role === 'guest') {
      navigate(PATHS.reservation, { replace: true })
    }
  }, [authReady, user, navigate])

  useEffect(() => {
    if (!authReady || user) return
    const code = rawParam?.trim()
    if (!code) return
    if (started.current) return
    started.current = true
    const decoded = decodeURIComponent(code)
    void loginGuest(decoded).catch(() => {
      /* lastError preenchido no AuthContext */
    })
  }, [authReady, user, rawParam, loginGuest])

  if (!authReady) {
    return (
      <div className="login-page login-page--loading">
        <div className="app-shell-loading" role="status" aria-live="polite">
          <span className="app-shell-loading__spinner" aria-hidden />
          <span className="visually-hidden">{t('common.verifyingSession')}</span>
        </div>
      </div>
    )
  }

  if (user?.role === 'admin') {
    return (
      <div className="login-page">
        <main className="login-page__main">
          <div className="login-card guest-magic-login__card">
            <h1 className="login-card__title">{t('guestMagicLogin.title')}</h1>
            <p className="login-card__subtitle">{t('guestMagicLogin.adminBlockLead')}</p>
            <ErrorMessage message={t('guestMagicLogin.adminMustLogout')} />
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              className="guest-magic-login__btn"
              onClick={() => void logout()}
            >
              {t('header.logout')}
            </Button>
          </div>
        </main>
      </div>
    )
  }

  if (user?.role === 'guest') {
    return (
      <div className="login-page login-page--loading">
        <div className="app-shell-loading" role="status" aria-live="polite">
          <span className="app-shell-loading__spinner" aria-hidden />
          <span className="visually-hidden">{t('guestMagicLogin.redirecting')}</span>
        </div>
      </div>
    )
  }

  const missingCode = !rawParam?.trim()
  const showError = missingCode ? t('guestMagicLogin.missingCode') : lastError

  return (
    <div className="login-page">
      <main className="login-page__main">
        <div className="login-card guest-magic-login__card">
          <h1 className="login-card__title">{t('guestMagicLogin.title')}</h1>
          <p className="login-card__subtitle">{t('guestMagicLogin.subtitle')}</p>
          {missingCode || lastError ? (
            <ErrorMessage message={showError} className="guest-magic-login__error" />
          ) : (
            <div className="app-shell-loading guest-magic-login__loading" role="status">
              <span className="app-shell-loading__spinner" aria-hidden />
              <span className="visually-hidden">{t('guestMagicLogin.signingIn')}</span>
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            className="guest-magic-login__btn"
            onClick={() => navigate(PATHS.login, { replace: true })}
          >
            {t('guestMagicLogin.goToLogin')}
          </Button>
        </div>
      </main>
    </div>
  )
}
