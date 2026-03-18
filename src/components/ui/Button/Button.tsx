import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import './Button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

function Spinner() {
  return (
    <svg
      className="ui-button__spinner"
      viewBox="0 0 24 24"
      aria-hidden
      width="1.125em"
      height="1.125em"
    >
      <circle
        className="ui-button__spinner-track"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        strokeWidth="3"
      />
      <circle
        className="ui-button__spinner-head"
        cx="12"
        cy="12"
        r="10"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref
  ) {
    const isDisabled = disabled || loading
    const classes = [
      'ui-button',
      `ui-button--${variant}`,
      `ui-button--${size}`,
      fullWidth && 'ui-button--full',
      loading && 'ui-button--loading',
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={isDisabled}
        aria-busy={loading}
        data-state={loading ? 'loading' : undefined}
        {...rest}
      >
        {loading ? (
          <>
            <Spinner />
            <span className="ui-button__label ui-button__label--hidden">
              {children}
            </span>
          </>
        ) : (
          <>
            {leftIcon ? (
              <span className="ui-button__icon ui-button__icon--left">
                {leftIcon}
              </span>
            ) : null}
            <span className="ui-button__label">{children}</span>
            {rightIcon ? (
              <span className="ui-button__icon ui-button__icon--right">
                {rightIcon}
              </span>
            ) : null}
          </>
        )}
      </button>
    )
  }
)
