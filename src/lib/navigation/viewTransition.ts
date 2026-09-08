import { flushSync } from 'react-dom'
import type { NavigateFunction, NavigateOptions, To } from 'react-router-dom'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isModifiedClick(
  event: Pick<MouseEvent, 'metaKey' | 'altKey' | 'ctrlKey' | 'shiftKey' | 'button'>,
): boolean {
  return Boolean(
    event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0,
  )
}

/** Runs a DOM/React update inside the View Transitions API when available. */
export function runViewTransition(update: () => void): void {
  if (prefersReducedMotion() || !('startViewTransition' in document)) {
    update()
    return
  }

  document.startViewTransition(() => {
    flushSync(update)
  })
}

export function navigateWithViewTransition(
  navigate: NavigateFunction,
  to: To,
  options?: NavigateOptions,
): void {
  runViewTransition(() => {
    navigate(to, options)
  })
}
