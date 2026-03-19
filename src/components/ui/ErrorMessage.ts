import { createElement } from 'react'

type ErrorMessageProps = {
  message?: string | null
  id?: string
  className?: string
}

export function ErrorMessage({ message, id, className = '' }: ErrorMessageProps) {
  if (!message) return null

  return createElement(
    'div',
    {
      id,
      className: `ui-error-message ${className}`.trim(),
      role: 'alert',
      'aria-live': 'polite',
    },
    message
  )
}
