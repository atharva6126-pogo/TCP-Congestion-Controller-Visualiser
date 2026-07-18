import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY)
  mediaQuery.addEventListener('change', onChange)
  return () => {
    mediaQuery.removeEventListener('change', onChange)
  }
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/** Whether the user prefers reduced motion (DESIGN_SPEC §10). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
