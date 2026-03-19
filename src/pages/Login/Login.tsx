import { useEffect, useId, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Button } from '../../components/ui/Button/Button'
import { ErrorMessage } from '../../components/ui/ErrorMessage'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/path'
import './Login.css'

export function LoginPage() {
  const { user, authReady, login, lastError, clearError } = useAuth()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from ?? PATHS.dashboard

  const emailId = useId()
  const passwordId = useId()
  const errorId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  useEffect(() => {
    clearError()
  }, [email, password, clearError])

  if (authReady && user) {
    return <Navigate to={from} replace />
  }

  if (!authReady) {
    return (
      <div className="login-page login-page--loading">
        <div className="app-shell-loading" role="status" aria-live="polite">
          <span className="app-shell-loading__spinner" aria-hidden />
          <span className="visually-hidden">Verificando sessão…</span>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldError(null)
    if (!email.trim()) {
      setFieldError('Informe seu e-mail.')
      return
    }
    if (!password) {
      setFieldError('Informe sua senha.')
      return
    }
    setSubmitting(true)
    try {
      await login(email, password)
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
      <div className="login-page__panel" aria-hidden />
      <main className="login-page__main">
        <div className="login-card">
          <header className="login-card__header">
            <div className="login-card__logo" aria-hidden>
              <span className="login-card__logo-mark" />
            </div>
            <h1 className="login-card__title">Entrar</h1>
            <p className="login-card__subtitle">
              Acesse o painel com seu e-mail corporativo.
            </p>
          </header>

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

            <div className="login-form__field">
              <label className="login-form__label" htmlFor={emailId}>
                E-mail
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className="login-form__input"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={invalid && !fieldError ? undefined : undefined}
                disabled={submitting}
              />
            </div>

            <div className="login-form__field">
              <div className="login-form__row">
                <label className="login-form__label" htmlFor={passwordId}>
                  Senha
                </label>
                <Link
                  to="#"
                  className="login-form__link"
                  onClick={(e) => e.preventDefault()}
                  tabIndex={-1}
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <input
                id={passwordId}
                name="password"
                type="password"
                autoComplete="current-password"
                className="login-form__input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              className="login-form__submit"
            >
              Entrar na plataforma
            </Button>
          </form>

          <p className="login-card__footer">
            Não tem conta?{' '}
            <Link to="#" className="login-form__link" onClick={(e) => e.preventDefault()}>
              Solicitar acesso
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
