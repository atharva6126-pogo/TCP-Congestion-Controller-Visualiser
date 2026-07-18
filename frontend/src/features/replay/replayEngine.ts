import type { ReplayClockState, ReplayControls, ReplaySpeed } from './replayClock'

/**
 * The replay engine: a framework-agnostic external store driving the
 * simulation-time cursor.
 *
 * While playing, a requestAnimationFrame loop interpolates the cursor
 * against a wall-clock anchor — `sim = anchorSim + elapsedWall × speed` —
 * so motion is smooth at any speed and never accumulates per-frame
 * drift. The anchor is re-established on play, seek, and speed changes,
 * which keeps the mapping exact and the replay deterministic: seeking to
 * a time t always lands on exactly t, and event stepping lands on exact
 * event timestamps.
 *
 * State is exposed as immutable snapshots (one object per change) so
 * React can bind via useSyncExternalStore; listeners fire once per
 * state change, at most once per animation frame during playback.
 */
export class ReplayEngine implements ReplayControls {
  private snapshot: ReplayClockState = {
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    speed: 1,
  }

  private listeners = new Set<() => void>()
  private eventTimestamps: readonly number[] = []
  private rafId: number | null = null
  private anchorWallMs = 0
  private anchorSimSeconds = 0

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): ReplayClockState => this.snapshot

  play = (): void => {
    const { currentTime, duration, isPlaying } = this.snapshot
    if (isPlaying || duration === 0) {
      return
    }
    // Playing from the end restarts the replay from the beginning.
    const startTime = currentTime >= duration ? 0 : currentTime
    this.setAnchor(startTime)
    this.setState({ currentTime: startTime, isPlaying: true })
    this.rafId = requestAnimationFrame(this.frame)
  }

  pause = (): void => {
    if (!this.snapshot.isPlaying) {
      return
    }
    this.stopLoop()
    this.setState({ isPlaying: false })
  }

  seek = (timeSeconds: number): void => {
    const clamped = Math.min(Math.max(timeSeconds, 0), this.snapshot.duration)
    this.setAnchor(clamped)
    this.setState({ currentTime: clamped })
  }

  setSpeed = (speed: ReplaySpeed): void => {
    // Re-anchor at the current cursor so a speed change never jumps time.
    this.setAnchor(this.snapshot.currentTime)
    this.setState({ speed })
  }

  loadTimeline = (durationSeconds: number, eventTimestamps: readonly number[] = []): void => {
    this.stopLoop()
    this.eventTimestamps = [...eventTimestamps].sort((a, b) => a - b)
    this.setState({
      currentTime: 0,
      duration: Math.max(durationSeconds, 0),
      isPlaying: false,
    })
  }

  stepForward = (): void => {
    const { currentTime, duration } = this.snapshot
    if (duration === 0) {
      return
    }
    const next = this.eventTimestamps.find((timestamp) => timestamp > currentTime)
    this.seek(next ?? duration)
  }

  stepBackward = (): void => {
    const { currentTime, duration } = this.snapshot
    if (duration === 0) {
      return
    }
    const previous = this.eventTimestamps.filter((timestamp) => timestamp < currentTime).at(-1)
    this.seek(previous ?? 0)
  }

  /** Cancels the loop and drops all listeners. Call on provider unmount. */
  destroy = (): void => {
    this.stopLoop()
    this.listeners.clear()
  }

  private frame = (nowMs: number): void => {
    if (!this.snapshot.isPlaying) {
      return
    }
    const elapsedSeconds = (nowMs - this.anchorWallMs) / 1000
    const simTime = this.anchorSimSeconds + elapsedSeconds * this.snapshot.speed
    if (simTime >= this.snapshot.duration) {
      // Completion: clamp exactly to the end and stop.
      this.rafId = null
      this.setState({ currentTime: this.snapshot.duration, isPlaying: false })
      return
    }
    this.setState({ currentTime: simTime })
    this.rafId = requestAnimationFrame(this.frame)
  }

  private setAnchor(simTimeSeconds: number): void {
    this.anchorWallMs = performance.now()
    this.anchorSimSeconds = simTimeSeconds
  }

  private setState(partial: Partial<ReplayClockState>): void {
    this.snapshot = { ...this.snapshot, ...partial }
    for (const listener of this.listeners) {
      listener()
    }
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
