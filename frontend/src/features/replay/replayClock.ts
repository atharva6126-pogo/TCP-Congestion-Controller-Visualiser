/**
 * The shared replay clock — DESIGN_SPEC §5's central law: every time-based
 * visual (charts, packet lane, stats, scrubber) is a pure function of
 * (timeline, cursor), and this clock owns the cursor. No component may
 * hold private playback state.
 */

/** Playback speeds offered by the transport bar (§4: 0.5–8×). */
export const REPLAY_SPEEDS = [0.5, 1, 2, 4, 8] as const

export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number]

export interface ReplayClock {
  /** Cursor position in simulation seconds. */
  currentTime: number
  /** Duration of the loaded timeline in simulation seconds; 0 when no run is loaded. */
  duration: number
  isPlaying: boolean
  speed: ReplaySpeed
  play: () => void
  pause: () => void
  /** Move the cursor; clamped to [0, duration]. */
  seek: (timeSeconds: number) => void
  setSpeed: (speed: ReplaySpeed) => void
  /** Called when a run loads; resets the cursor to 0. */
  loadTimeline: (durationSeconds: number) => void
}
