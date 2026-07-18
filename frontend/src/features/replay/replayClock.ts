/**
 * The shared replay clock — DESIGN_SPEC §5's central law: every time-based
 * visual (charts, packet lane, stats, scrubber) is a pure function of
 * (timeline, cursor), and this clock owns the cursor. No component may
 * hold private playback state.
 */

/** Playback speeds offered by the transport bar (§4: 0.5–8×). */
export const REPLAY_SPEEDS = [0.5, 1, 2, 4, 8] as const

export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number]

/** Reactive snapshot of the clock; one immutable object per change. */
export interface ReplayClockState {
  /** Cursor position in simulation seconds. */
  currentTime: number
  /** Duration of the loaded timeline in simulation seconds; 0 when no run is loaded. */
  duration: number
  isPlaying: boolean
  speed: ReplaySpeed
}

/** Imperative surface of the clock; methods are referentially stable. */
export interface ReplayControls {
  play: () => void
  pause: () => void
  /** Move the cursor; clamped to [0, duration]. Takes effect immediately. */
  seek: (timeSeconds: number) => void
  setSpeed: (speed: ReplaySpeed) => void
  /**
   * Called when a run loads; resets the cursor to 0 and stops playback.
   * `eventTimestamps` (simulation seconds) enable event stepping.
   */
  loadTimeline: (durationSeconds: number, eventTimestamps?: readonly number[]) => void
  /** Jump the cursor to the next event timestamp (or the end). */
  stepForward: () => void
  /** Jump the cursor to the previous event timestamp (or the start). */
  stepBackward: () => void
}

export interface ReplayClock extends ReplayClockState, ReplayControls {}
