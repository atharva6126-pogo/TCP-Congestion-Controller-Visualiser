/**
 * Pure derivations for comparison mode (DESIGN_SPEC §15).
 *
 * Runs arrive from the same endpoint as a single run, one per
 * algorithm, all built from one configuration — so identical
 * conditions and a shared seed hold by construction. Everything here
 * is a function of (runs, cursor); nothing stores state.
 */

import type { SimulationRun } from '../../lib/api/simulations'
import { buildCwndSeries } from '../charts/cwndSeries'
import type { CwndSeries } from '../charts/cwndSeries'
import { ALGORITHM_ORDER } from '../simulation/algorithmColors'
import type { AlgorithmName } from '../simulation/timeline'

export type RunMap = ReadonlyMap<AlgorithmName, SimulationRun>

export interface AlgorithmSeries {
  algorithm: AlgorithmName
  series: CwndSeries
}

/** Window series per algorithm, in canonical order. */
export function buildAlgorithmSeries(runs: RunMap): AlgorithmSeries[] {
  return ALGORITHM_ORDER.filter((algorithm) => runs.has(algorithm)).map((algorithm) => ({
    algorithm,
    series: buildCwndSeries(runs.get(algorithm)!.timeline),
  }))
}

/**
 * The replay clock spans every run, so the scrubber covers the longest
 * algorithm and stepping visits any algorithm's events.
 */
export function mergeTimelines(runs: RunMap): {
  durationSeconds: number
  eventTimestamps: number[]
} {
  let durationSeconds = 0
  const timestamps = new Set<number>()
  for (const run of runs.values()) {
    durationSeconds = Math.max(durationSeconds, run.timeline.durationSeconds)
    for (const event of run.timeline.events) {
      timestamps.add(event.timestamp)
    }
  }
  return { durationSeconds, eventTimestamps: [...timestamps].sort((a, b) => a - b) }
}

/** One row of the merged overlay: every algorithm's window at that instant. */
export interface ComparisonPoint {
  time: number
  values: Readonly<Record<string, number>>
}

/**
 * Merge the per-algorithm step series onto one time axis, holding each
 * algorithm's last window value between its own samples. Independent
 * of the cursor, so it is computed once per run set.
 */
export function buildComparisonPoints(list: readonly AlgorithmSeries[]): ComparisonPoint[] {
  const times = new Set<number>()
  for (const entry of list) {
    for (const sample of entry.series.samples) {
      times.add(sample.time)
    }
  }
  const sortedTimes = [...times].sort((a, b) => a - b)

  const cursors = new Map<AlgorithmName, number>()
  const held = new Map<AlgorithmName, number>()
  for (const entry of list) {
    cursors.set(entry.algorithm, 0)
    held.set(entry.algorithm, entry.series.samples[0]?.cwnd ?? 0)
  }

  return sortedTimes.map((time) => {
    const values: Record<string, number> = {}
    for (const entry of list) {
      let index = cursors.get(entry.algorithm) ?? 0
      const samples = entry.series.samples
      while (index < samples.length && samples[index]!.time <= time) {
        held.set(entry.algorithm, samples[index]!.cwnd)
        index += 1
      }
      cursors.set(entry.algorithm, index)
      values[entry.algorithm] = held.get(entry.algorithm) ?? 0
    }
    return { time, values }
  })
}

export const PAST_KEY_PREFIX = 'past_'
export const GHOST_KEY_PREFIX = 'ghost_'

export type OverlayRow = Record<string, number | null> & { time: number }

/**
 * Split every algorithm's line at the cursor: solid up to it, the §14
 * ghost beyond. A synthetic row at the cursor carries both sides so
 * the lines join without a seam.
 */
export function toOverlayRows(
  points: readonly ComparisonPoint[],
  algorithms: readonly AlgorithmName[],
  cursor: number,
  durationSeconds: number,
): OverlayRow[] {
  if (points.length === 0) {
    return []
  }

  let heldIndex = 0
  for (const [index, point] of points.entries()) {
    if (point.time <= cursor) {
      heldIndex = index
    } else {
      break
    }
  }
  const heldValues = points[heldIndex]!.values

  const rows: OverlayRow[] = []
  let lastTime = Number.NEGATIVE_INFINITY

  const push = (time: number, values: Readonly<Record<string, number>>) => {
    if (time === lastTime) {
      return
    }
    lastTime = time
    const row: OverlayRow = { time }
    for (const algorithm of algorithms) {
      const value = values[algorithm]
      if (value === undefined) {
        continue
      }
      row[`${PAST_KEY_PREFIX}${algorithm}`] = time <= cursor ? value : null
      row[`${GHOST_KEY_PREFIX}${algorithm}`] = time >= cursor ? value : null
    }
    rows.push(row)
  }

  let cursorInserted = false
  for (const point of points) {
    if (!cursorInserted && point.time >= cursor) {
      push(cursor, heldValues)
      cursorInserted = true
    }
    push(point.time, point.values)
  }
  if (!cursorInserted) {
    push(cursor, heldValues)
  }
  const lastPoint = points[points.length - 1]!
  if (durationSeconds >= lastPoint.time) {
    push(durationSeconds, lastPoint.values)
  }

  return rows
}

/** A y-domain shared by every cell, so small multiples are comparable (§15). */
export function lockedWindowDomain(list: readonly AlgorithmSeries[]): [number, number] {
  const peak = list.reduce((max, entry) => Math.max(max, entry.series.maxCwnd), 1)
  return [0, Math.ceil(peak + 1)]
}

/* ---------------------------------------------------------------- */
/* Delta statistics                                                   */
/* ---------------------------------------------------------------- */

export interface MetricDefinition {
  key: string
  label: string
  /** Which direction counts as better, for marking and for delta signs. */
  better: 'higher' | 'lower'
  read: (run: SimulationRun, series: CwndSeries) => number
  format: (value: number) => string
}

function formatFixed(digits: number, unit = ''): (value: number) => string {
  return (value) => `${value.toFixed(digits)}${unit}`
}

export const COMPARISON_METRICS: readonly MetricDefinition[] = [
  {
    key: 'peak_window',
    label: 'Peak window',
    better: 'higher',
    read: (_run, series) => series.maxCwnd,
    format: formatFixed(1, ' seg'),
  },
  {
    key: 'throughput',
    label: 'Throughput',
    better: 'higher',
    read: (run) => run.statistics.throughputBytesPerSecond / 1000,
    format: formatFixed(1, ' kB/s'),
  },
  {
    key: 'delivery_ratio',
    label: 'Delivery ratio',
    better: 'higher',
    read: (run) => run.statistics.packetDeliveryRatio * 100,
    format: formatFixed(1, '%'),
  },
  {
    key: 'mean_rtt',
    label: 'Mean RTT',
    better: 'lower',
    read: (run) => run.statistics.averageRttSeconds * 1000,
    format: formatFixed(1, ' ms'),
  },
  {
    key: 'retransmissions',
    label: 'Retransmissions',
    better: 'lower',
    read: (run) => run.statistics.retransmissionCount,
    format: formatFixed(0),
  },
  {
    key: 'packet_loss',
    label: 'Packets lost',
    better: 'lower',
    read: (run) => run.statistics.packetLossCount,
    format: formatFixed(0),
  },
]

export interface MetricRow {
  key: string
  label: string
  better: 'higher' | 'lower'
  values: ReadonlyMap<AlgorithmName, number>
  /** Algorithms tied for the best value; empty when every value matches. */
  best: readonly AlgorithmName[]
  format: (value: number) => string
}

export function buildMetricRows(runs: RunMap, list: readonly AlgorithmSeries[]): MetricRow[] {
  return COMPARISON_METRICS.map((metric) => {
    const values = new Map<AlgorithmName, number>()
    for (const entry of list) {
      const run = runs.get(entry.algorithm)
      if (run !== undefined) {
        values.set(entry.algorithm, metric.read(run, entry.series))
      }
    }

    const numbers = [...values.values()]
    const bestValue =
      numbers.length === 0
        ? null
        : metric.better === 'higher'
          ? Math.max(...numbers)
          : Math.min(...numbers)
    const allEqual = numbers.every((value) => value === numbers[0])
    const best =
      bestValue === null || allEqual
        ? []
        : [...values.entries()]
            .filter(([, value]) => value === bestValue)
            .map(([algorithm]) => algorithm)

    return {
      key: metric.key,
      label: metric.label,
      better: metric.better,
      values,
      best,
      format: metric.format,
    }
  })
}

/** Signed difference against a baseline, with whether it is an improvement. */
export interface Delta {
  value: number
  improvement: boolean | null
}

export function deltaAgainst(
  row: MetricRow,
  algorithm: AlgorithmName,
  baseline: AlgorithmName,
): Delta | null {
  const value = row.values.get(algorithm)
  const reference = row.values.get(baseline)
  if (value === undefined || reference === undefined) {
    return null
  }
  const difference = value - reference
  if (difference === 0) {
    return { value: 0, improvement: null }
  }
  return {
    value: difference,
    improvement: row.better === 'higher' ? difference > 0 : difference < 0,
  }
}
