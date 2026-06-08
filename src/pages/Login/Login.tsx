import { useEffect, useId, useState } from 'react'
import { GiLotusFlower } from 'react-icons/gi'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { useAuth } from '../../hooks/useAuth'
import { getDefaultPathForUser } from '../../lib/defaultRoute'
import './Login.css'

export function LoginPage() {
  const { t } = useTranslation()
  const { user, authReady, loginGuest, loginAdmin, lastError, clearError } = useAuth()
  const location = useLocation()
  const fromState = (location.state as { from?: string } | null)?.from

  const reservationId = useId()
  const emailId = useId()
  const passwordAdminId = useId()
  const errorId = useId()

  const [authMode, setAuthMode] = useState<'guest' | 'admin'>('guest')
  const [reservationCode, setReservationCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    clearError()
  }, [reservationCode, email, password, authMode, clearError, t])

  if (authReady && user) {
    const target = fromState ?? getDefaultPathForUser(user)
    return <Navigate to={target} replace />
  }

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)

    if (authMode === 'guest') {
      if (!reservationCode.trim()) {
        setFieldError(t('login.errorReservationRequired'))
        return
      }
      setSubmitting(true)
      try {
        await loginGuest(reservationCode)
      } catch {
        /* erro já em lastError */
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!email.trim()) {
      setFieldError(t('login.errorEmailRequired'))
      return
    }
    if (!password) {
      setFieldError(t('login.errorPasswordRequired'))
      return
    }
    setSubmitting(true)
    try {
      await loginAdmin(email, password)
    } catch {
      /* erro já em lastError */
    } finally {
      setSubmitting(false)
    }
  }

  const showError = fieldError || lastError
  const invalid = Boolean(showError)

  return (
    <div className="login-page">
      <main className="login-page__main">
        <div className="login-card">
          <header className="login-card__header">
            <div className="login-card__logo" aria-hidden>
              <span className="login-card__logo-mark">
                <GiLotusFlower className="login-card__logo-icon" aria-hidden />
              </span>
            </div>
            <h1 className="login-card__title">
              {authMode === 'guest'
                ? t('login.titleGuest')
                : t('login.titleSignIn')}
            </h1>
            <p className="login-card__subtitle">
              {authMode === 'guest'
                ? t('login.subtitleGuest')
                : t('login.subtitleCorp')}
            </p>
          </header>

          <div className="login-card__modes" role="tablist" aria-label={t('login.modeAria')}>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'guest'}
              className={`login-card__mode-btn ${authMode === 'guest' ? 'is-active' : ''}`}
              onClick={() => setAuthMode('guest')}
            >
              {t('login.modeGuest')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={authMode === 'admin'}
              className={`login-card__mode-btn ${authMode === 'admin' ? 'is-active' : ''}`}
              onClick={() => setAuthMode('admin')}
            >
              {t('login.modeAdmin')}
            </button>
          </div>

          <form
            className="login-form"
            onSubmit={handleSubmit}
            noValidate
            aria-describedby={invalid ? errorId : undefined}
          >
            <ErrorMessage
              id={invalid ? errorId : undefined}
              message={fieldError || lastError}
            />

            {authMode === 'guest' ? (
              <>
                <div className="login-form__field">
                  <label className="login-form__label" htmlFor={reservationId}>
                    {t('login.reservationCode')}
                  </label>
                  <input
                    id={reservationId}
                    name="reservationCode"
                    type="text"
                    autoComplete="off"
                    className="login-form__input"
                    placeholder={t('login.reservationPlaceholder')}
                    value={reservationCode}
                    onChange={(e) => setReservationCode(e.target.value)}
                    disabled={submitting}
                  />
                  <p className="login-form__hint">{t('login.reservationStaysHint')}</p>
                </div>
              </>
            ) : (
              <>
                <div className="login-form__field">
                  <label className="login-form__label" htmlFor={emailId}>
                    {t('login.email')}
                  </label>
                  <input
                    id={emailId}
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    className="login-form__input"
                    placeholder={t('login.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="login-form__field">
                  <div className="login-form__row">
                    <label className="login-form__label" htmlFor={passwordAdminId}>
                      {t('login.password')}
                    </label>
                    <Link
                      to="#"
                      className="login-form__link"
                      onClick={(e) => e.preventDefault()}
                      tabIndex={-1}
                    >
                      {t('login.forgotPassword')}
                    </Link>
                  </div>
                  <input
                    id={passwordAdminId}
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="login-form__input"
                    placeholder={t('login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              className="login-form__submit"
            >
              {authMode === 'guest'
                ? t('login.submitGuest')
                : t('login.submitSignIn')}
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
