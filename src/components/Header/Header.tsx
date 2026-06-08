import { useRef, useEffect, type ReactNode } from 'react'
import { Button } from '../ui/Button/Button'
import './Header.css'

type HeaderProps = {
  title?: string
  onMenuClick: () => void
  /** Desktop: botão recolher/expandir sidebar. Oculto em mobile (bottom bar). */
  showMenuButton?: boolean
  menuAriaLabel?: string
  /** Ex.: centro de notificações do hóspede (antes do bloco do utilizador). */
  trailingSlot?: ReactNode
  userLabel: string
  userInitial: string
  onLogout: () => void
  logoutLoading?: boolean
  logoutLabel?: string
}

export function Header({
  title = 'Painel',
  onMenuClick,
  showMenuButton = true,
  menuAriaLabel = 'Abrir menu de navegação',
  trailingSlot,
  userLabel,
  userInitial,
  onLogout,
  logoutLoading,
  logoutLabel = 'Sair',
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
        {showMenuButton ? (
          <button
            ref={menuBtnRef}
            type="button"
            className="app-header__menu-btn"
            onClick={onMenuClick}
            aria-label={menuAriaLabel}
          >
            <span className="app-header__menu-icon" aria-hidden>
              <span />
              <span />
              <span />
            </span>
          </button>
        ) : null}
        <h1 className="app-header__title">{title}</h1>
      </div>

      <div className="app-header__right">
        {trailingSlot ? (
          <div className="app-header__trailing">{trailingSlot}</div>
        ) : null}
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
          {logoutLabel}
        </Button>
      </div>
    </header>
  )
}
