import { useEffect, useMemo, useRef, useState } from 'react'

import { buildCwndSeries } from '../charts/cwndSeries'
import { useSimulation } from '../simulation/useSimulation'
import { useReplayClock } from './useReplayClock'

/** Human wording for the phase names the backend reports. */
const PHASE_LABEL = {
  slow_start: 'slow start',
  congestion_avoidance: 'congestion avoidance',
  fast_recovery: 'fast recovery',
} as const

/** At most one announcement per second, per DESIGN_SPEC §18. */
const ANNOUNCE_INTERVAL_MS = 1000

/**
 * Screen-reader narration of the replay (DESIGN_SPEC §18): the cursor,
 * the window, and the phase, in a polite live region.
 *
 * Rate-limited to once a second — the cursor changes every frame, and
 * an unthrottled live region would produce speech no one can follow.
 * Rendering nothing visible, it is the audible counterpart of the
 * chart, not a second source of truth: every value is read from the
 * same (timeline, cursor) pair the visuals use.
 */
export function ReplayAnnouncer() {
  const { currentTime } = useReplayClock()
  const { activeRun } = useSimulation()
  const [message, setMessage] = useState('')
  const lastAnnouncedAtMs = useRef(0)

  const samples = useMemo(
    () => (activeRun === null ? [] : buildCwndSeries(activeRun.timeline).samples),
    [activeRun],
  )

  useEffect(() => {
    if (samples.length === 0) {
      setMessage('')
      return
    }
    const now = performance.now()
    if (now - lastAnnouncedAtMs.current < ANNOUNCE_INTERVAL_MS) {
      return
    }
    lastAnnouncedAtMs.current = now

    // The sample in effect at the cursor: values hold until the next change.
    let current = samples[0]
    for (const sample of samples) {
      if (sample.time > currentTime) {
        break
      }
      current = sample
    }
    if (current === undefined) {
      return
    }
    setMessage(
      `t = ${currentTime.toFixed(1)} seconds, window ${current.cwnd} segments, ${
        PHASE_LABEL[current.phase]
      }`,
    )
  }, [currentTime, samples])

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  )
}
