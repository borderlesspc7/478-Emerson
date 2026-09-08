import { useRef } from 'react'
import {
  useLocation,
  useNavigationType,
  useOutlet,
} from 'react-router-dom'
import {
  getTransitionDirection,
  resolveTransitionKey,
} from '../../lib/navigation/transitionConfig'

type AnimatedOutletProps = {
  /** section: collapse child routes under parent keys; full: animate every path change */
  scope?: 'section' | 'full'
  variant?: 'page' | 'tab'
}

/**
 * CSS View Transitions wrapper around React Router's outlet.
 * Framer Motion is intentionally omitted to keep the PWA bundle lean;
 * Chrome/Edge get VT morph; other browsers get an instant swap (no jank).
 */
export function AnimatedOutlet({
  scope = 'section',
  variant = 'page',
}: AnimatedOutletProps) {
  const outlet = useOutlet()
  const location = useLocation()
  const navigationType = useNavigationType()
  const previousPath = useRef(location.pathname)

  const key = resolveTransitionKey(location.pathname, scope)
  const direction = getTransitionDirection(
    previousPath.current,
    location.pathname,
    navigationType,
  )
  previousPath.current = location.pathname

  return (
    <div
      className={variant === 'tab' ? 'vt-tab' : 'vt-page'}
      data-vt-direction={direction}
      key={key}
    >
      {outlet}
    </div>
  )
}
