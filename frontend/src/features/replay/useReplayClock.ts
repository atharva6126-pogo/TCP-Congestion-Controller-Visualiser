import { useMemo, useSyncExternalStore } from 'react'

import type { ReplayClock } from './replayClock'
import { useReplayEngine } from './useReplayEngine'

/**
 * The full live clock, including the frame-accurate cursor. Components
 * calling this re-render on every cursor change while playing — use it
 * only where time is actually displayed or drawn (transport bar, and
 * later the charts and packet lane). Components that only need controls
 * or discrete state should use useReplayControls instead.
 */
export function useReplayClock(): ReplayClock {
  const engine = useReplayEngine()
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot)

  return useMemo(
    () => ({
      ...state,
      play: engine.play,
      pause: engine.pause,
      seek: engine.seek,
      setSpeed: engine.setSpeed,
      loadTimeline: engine.loadTimeline,
      stepForward: engine.stepForward,
      stepBackward: engine.stepBackward,
    }),
    [state, engine],
  )
}
