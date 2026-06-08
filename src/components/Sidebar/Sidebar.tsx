import { GiLotusFlower } from 'react-icons/gi'
import {
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { useAppNavigation } from '../../hooks/useAppNavigation'
import './Sidebar.css'

type SidebarProps = {
  collapsed: boolean
  onToggleSidebar: () => void
}

export function Sidebar({ collapsed, onToggleSidebar }: SidebarProps) {
  const { t } = useTranslation()
  const { items, pendingOrdersBadge, pendingOrdersCount } = useAppNavigation()

  return (
    <aside
      className={['app-sidebar', collapsed ? 'is-collapsed' : ''].filter(Boolean).join(' ')}
      aria-label={t('nav.mainAria')}
    >
      <div className="app-sidebar__brand">
        <span className="app-sidebar__logo" aria-hidden>
          <GiLotusFlower className="app-sidebar__logo-icon" aria-hidden />
        </span>
        <span className="app-sidebar__name">{t('nav.brand')}</span>
      </div>

      <nav className="app-sidebar__nav" aria-label={t('nav.pagesAria')}>
        <ul className="app-sidebar__list">
          {items.map(({ to, labelKey, icon: Icon, matchEnd, showOrdersBadge }) => {
            const label = t(labelKey)
            const badge =
              showOrdersBadge && pendingOrdersBadge !== null ? pendingOrdersBadge : null
            const ordersAria =
              badge !== null
                ? `${label}. ${t('nav.pendingOrdersAria', { count: pendingOrdersCount })}`
                : undefined

            return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={matchEnd}
                  className={({ isActive }) =>
                    [
                      'app-sidebar__link',
                      isActive ? 'is-active' : '',
                      badge !== null ? 'app-sidebar__link--with-badge' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                  }
                  title={label}
                  {...(ordersAria ? { 'aria-label': ordersAria } : {})}
                >
                  <Icon className="app-sidebar__icon" />
                  <span className="app-sidebar__label">{label}</span>
                  {badge !== null ? (
                    <span className="app-sidebar__badge" aria-hidden>
                      {badge}
                    </span>
                  ) : null}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="app-sidebar__toolbar">
        <button
          type="button"
          className="app-sidebar__collapse-btn"
          onClick={onToggleSidebar}
          aria-label={
            collapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')
          }
          title={collapsed ? t('nav.expandShort') : t('nav.collapseShort')}
        >
          {collapsed ? (
            <MdKeyboardDoubleArrowRight aria-hidden className="app-sidebar__collapse-icon" />
          ) : (
            <MdKeyboardDoubleArrowLeft aria-hidden className="app-sidebar__collapse-icon" />
          )}
        </button>
      </div>

      <div className="app-sidebar__footer">
        <p className="app-sidebar__hint">{t('nav.footerHint')}</p>
      </div>
    </aside>
  )
}
