/**
 * Pure derivations for the congestion window chart (DESIGN_SPEC §14).
 *
 * Like the packet lane, everything here is a pure function of the
 * timeline and the replay cursor — no mutable UI state — so the chart
 * is deterministic under play, pause, seek, speed changes, completion,
 * and repeated replays.
 */

import type { CongestionPhase, SimulationTimeline } from '../simulation/timeline'

export interface CwndSample {
  time: number
  cwnd: number
  phase: CongestionPhase
}

/** A contiguous stretch of one phase, for the chart's background bands. */
export interface PhaseSpan {
  phase: CongestionPhase
  startTime: number
  endTime: number
  /** Only the first span of each phase is labelled (§14). */
  labelled: boolean
}

export type LossKind = 'triple_duplicate_ack' | 'timeout'

export interface LossMarker {
  time: number
  cwnd: number
  kind: LossKind
}

export interface CwndSeries {
  samples: readonly CwndSample[]
  phaseSpans: readonly PhaseSpan[]
  lossMarkers: readonly LossMarker[]
  /** Upper bound for the y-axis domain, in segments. */
  maxCwnd: number
}

/** The congestion window in effect at time `t` (values hold until the next change). */
export function cwndAt(samples: readonly CwndSample[], t: number): number {
  let value = samples[0]?.cwnd ?? 0
  for (const sample of samples) {
    if (sample.time > t) {
      break
    }
    value = sample.cwnd
  }
  return value
}

export function buildCwndSeries(timeline: SimulationTimeline): CwndSeries {
  const samples: CwndSample[] = []
  for (const event of timeline.events) {
    if (
      event.eventType === 'congestion_window_changed' &&
      event.congestionWindowSegments !== undefined &&
      event.phase !== undefined
    ) {
      samples.push({
        time: event.timestamp,
        cwnd: event.congestionWindowSegments,
        phase: event.phase,
      })
    }
  }

  const phaseSpans: PhaseSpan[] = []
  const seenPhases = new Set<CongestionPhase>()
  for (const [index, sample] of samples.entries()) {
    const previous = phaseSpans.at(-1)
    if (previous !== undefined && previous.phase === sample.phase) {
      continue
    }
    if (previous !== undefined) {
      previous.endTime = sample.time
    }
    phaseSpans.push({
      phase: sample.phase,
      startTime: index === 0 ? 0 : sample.time,
      endTime: timeline.durationSeconds,
      labelled: !seenPhases.has(sample.phase),
    })
    seenPhases.add(sample.phase)
  }

  const lossMarkers: LossMarker[] = []
  const seenMarkers = new Set<string>()
  for (const event of timeline.events) {
    const signal = event.signal
    if (
      event.eventType !== 'packet_lost' ||
      signal === undefined ||
      signal.kind === 'ack_received'
    ) {
      continue
    }
    // Several packets can be lost at one instant; one marker suffices.
    const key = `${event.timestamp}:${signal.kind}`
    if (seenMarkers.has(key)) {
      continue
    }
    seenMarkers.add(key)
    lossMarkers.push({
      time: event.timestamp,
      cwnd: cwndAt(samples, event.timestamp),
      kind: signal.kind,
    })
  }

  const maxCwnd = samples.reduce((max, sample) => Math.max(max, sample.cwnd), 1)
  return { samples, phaseSpans, lossMarkers, maxCwnd }
}

/**
 * One row per chart point, with the window split across two series so
 * the segment already replayed draws at full opacity and the rest
 * draws as the §14 ghost. A synthetic point at the cursor carries both
 * values, joining the two lines without a visible seam.
 */
export interface CwndChartPoint {
  time: number
  past: number | null
  future: number | null
}

export function toChartPoints(
  samples: readonly CwndSample[],
  cursor: number,
  durationSeconds: number,
): CwndChartPoint[] {
  if (samples.length === 0) {
    return []
  }

  const heldAtCursor = cwndAt(samples, cursor)
  const points: CwndChartPoint[] = []
  let lastTime = Number.NEGATIVE_INFINITY

  // Points are appended in ascending time, so no sort is needed; a
  // point already at `time` (the cursor landing on a sample, or on the
  // timeline end) is never duplicated.
  const push = (time: number, cwnd: number) => {
    if (time === lastTime) {
      return
    }
    lastTime = time
    points.push({
      time,
      past: time <= cursor ? cwnd : null,
      future: time >= cursor ? cwnd : null,
    })
  }

  let cursorInserted = false
  for (const sample of samples) {
    if (!cursorInserted && sample.time >= cursor) {
      push(cursor, heldAtCursor)
      cursorInserted = true
    }
    push(sample.time, sample.cwnd)
  }
  if (!cursorInserted) {
    push(cursor, heldAtCursor)
  }
  // Hold the final value out to the end of the timeline.
  const lastSample = samples[samples.length - 1]
  if (lastSample !== undefined && durationSeconds >= lastSample.time) {
    push(durationSeconds, lastSample.cwnd)
  }

  return points
}
