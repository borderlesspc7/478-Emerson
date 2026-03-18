import { useRef, useEffect } from 'react'
import { Button } from '../ui/Button/Button'
import './Header.css'

type HeaderProps = {
  title?: string
  onMenuClick: () => void
  userLabel: string
  userInitial: string
  onLogout: () => void
  logoutLoading?: boolean
}

export function Header({
  title = 'Painel',
  onMenuClick,
  userLabel,
  userInitial,
  onLogout,
  logoutLoading,
}: HeaderProps) {
  const menuBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && document.activeElement === menuBtnRef.current) {
        menuBtnRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="app-header">
      <div className="app-header__left">
        <button
          ref={menuBtnRef}
          type="button"
          className="app-header__menu-btn"
          onClick={onMenuClick}
          aria-label="Abrir menu de navegação"
        >
          <span className="app-header__menu-icon" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </button>
        <h1 className="app-header__title">{title}</h1>
      </div>

      <div className="app-header__right">
        <div className="app-header__user" title={userLabel}>
          <span className="app-header__avatar" aria-hidden>
            {userInitial}
          </span>
          <span className="app-header__user-text">{userLabel}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onLogout}
          loading={logoutLoading}
          className="app-header__logout"
        >
          Sair
        </Button>
      </div>
    </header>
  )
}
