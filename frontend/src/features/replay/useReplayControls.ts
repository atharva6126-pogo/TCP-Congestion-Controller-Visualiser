import { useMemo, useSyncExternalStore } from 'react'

import type { ReplayControls, ReplaySpeed } from './replayClock'
import { useReplayEngine } from './useReplayEngine'

export interface ReplayControlsWithState extends ReplayControls {
  duration: number
  isPlaying: boolean
  speed: ReplaySpeed
}

/**
 * Controls plus discrete clock state only — everything except the
 * frame-accurate cursor. Each field is selected individually, so
 * components using this hook re-render on play/pause, speed, and
 * timeline changes but never on per-frame cursor ticks.
 */
export function useReplayControls(): ReplayControlsWithState {
  const engine = useReplayEngine()
  const duration = useSyncExternalStore(engine.subscribe, () => engine.getSnapshot().duration)
  const isPlaying = useSyncExternalStore(engine.subscribe, () => engine.getSnapshot().isPlaying)
  const speed = useSyncExternalStore(engine.subscribe, () => engine.getSnapshot().speed)

  return useMemo(
    () => ({
      duration,
      isPlaying,
      speed,
      play: engine.play,
      pause: engine.pause,
      seek: engine.seek,
      setSpeed: engine.setSpeed,
      loadTimeline: engine.loadTimeline,
      stepForward: engine.stepForward,
      stepBackward: engine.stepBackward,
    }),
    [duration, isPlaying, speed, engine],
  )
}
