import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

import { ReplayClockContext } from './ReplayClockContext'
import { ReplayEngine } from './replayEngine'

/**
 * Owns the ReplayEngine instance — the single source of truth for
 * simulation time. The engine outlives renders (one instance per
 * provider) and is destroyed on unmount, cancelling any pending
 * animation frame and releasing listeners.
 */
export function ReplayClockProvider({ children }: { children: ReactNode }) {
  const engineRef = useRef<ReplayEngine | null>(null)
  engineRef.current ??= new ReplayEngine()
  const engine = engineRef.current

  useEffect(() => {
    // destroy() is idempotent and non-terminal (subscribe works after),
    // so StrictMode's mount → cleanup → mount cycle is safe.
    return () => {
      engine.destroy()
    }
  }, [engine])

  return <ReplayClockContext value={engine}>{children}</ReplayClockContext>
}
