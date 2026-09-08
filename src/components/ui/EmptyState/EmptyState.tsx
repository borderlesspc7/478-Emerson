import type { ReactNode } from 'react'
import { MdErrorOutline, MdInbox } from 'react-icons/md'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  variant?: 'empty' | 'error'
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  variant = 'empty',
  className,
}: EmptyStateProps) {
  const DefaultIcon = variant === 'error' ? MdErrorOutline : MdInbox

  return (
    <div
      className={['ui-state', variant === 'error' ? 'ui-state--error' : '', className]
        .filter(Boolean)
        .join(' ')}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <span className="ui-state__icon" aria-hidden>
        {icon ?? <DefaultIcon />}
      </span>
      <h3 className="ui-state__title">{title}</h3>
      {description ? <p className="ui-state__body">{description}</p> : null}
      {action ? <div className="ui-state__actions">{action}</div> : null}
    </div>
  )
}
