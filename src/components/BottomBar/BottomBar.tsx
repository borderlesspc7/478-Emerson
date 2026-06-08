import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { useAppNavigation } from '../../hooks/useAppNavigation'
import './BottomBar.css'

export function BottomBar() {
  const { t } = useTranslation()
  const { items, pendingOrdersBadge, pendingOrdersCount } = useAppNavigation()

  return (
    <nav className="app-bottom-bar" aria-label={t('nav.mainAria')}>
      <ul className="app-bottom-bar__list">
        {items.map(({ to, labelKey, icon: Icon, matchEnd, showOrdersBadge }) => {
          const label = t(labelKey)
          const badge =
            showOrdersBadge && pendingOrdersBadge !== null ? pendingOrdersBadge : null
          const ariaLabel =
            badge !== null
              ? `${label}. ${t('nav.pendingOrdersAria', { count: pendingOrdersCount })}`
              : label

          return (
            <li key={to} className="app-bottom-bar__item">
              <NavLink
                to={to}
                end={matchEnd}
                className={({ isActive }) =>
                  ['app-bottom-bar__link', isActive ? 'is-active' : ''].filter(Boolean).join(' ')
                }
                aria-label={ariaLabel}
                title={label}
              >
                <Icon className="app-bottom-bar__icon" aria-hidden />
                <span className="app-bottom-bar__label" aria-hidden>
                  {label}
                </span>
                {badge !== null ? (
                  <span className="app-bottom-bar__badge" aria-hidden>
                    {badge}
                  </span>
                ) : null}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
