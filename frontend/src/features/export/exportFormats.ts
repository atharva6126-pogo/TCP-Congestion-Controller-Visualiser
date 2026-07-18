/**
 * Export payload builders (DESIGN_SPEC §2, §18).
 *
 * Pure string builders, deliberately separate from the download
 * mechanism: what a report contains is a domain question, how bytes
 * reach the disk is a browser one. Every export names its algorithm and
 * seed, so an exported artifact can always be traced back to the run —
 * and re-run — that produced it.
 */

import { buildCwndSeries } from '../charts/cwndSeries'
import type { SimulationRun } from '../../lib/api/simulations'
import type { SimulationFormConfig } from '../simulation/config'
import { BANDWIDTH_BYTES_PER_SECOND } from '../simulation/config'
import type { AlgorithmName, SimulationEvent } from '../simulation/timeline'

export type RunMap = ReadonlyMap<AlgorithmName, SimulationRun>

/** RFC 4180 quoting: only fields that need it are quoted. */
function csvField(value: string | number): string {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function csvRows(rows: readonly (readonly (string | number)[])[]): string {
  return rows.map((row) => row.map(csvField).join(',')).join('\n') + '\n'
}

/**
 * The signal that explains an event, flattened to two columns so the
 * CSV stays rectangular — spreadsheets cannot read a tagged union.
 */
function signalColumns(event: SimulationEvent): [string, string] {
  const signal = event.signal
  if (signal === undefined) {
    return ['', '']
  }
  if (signal.kind === 'ack_received') {
    return [signal.kind, String(signal.ackSequenceNumber)]
  }
  return [signal.kind, String(signal.highestTransmittedSequenceNumber)]
}

/**
 * Every event of every run, one row each. In comparison mode the runs
 * share a time axis, so a single file with an `algorithm` column stays
 * sortable and directly comparable.
 */
export function buildTimelineCsv(runs: RunMap): string {
  const rows: (string | number)[][] = [
    [
      'algorithm',
      'time_seconds',
      'event_type',
      'sequence_number',
      'size_bytes',
      'congestion_window_segments',
      'phase',
      'signal_kind',
      'signal_sequence_number',
    ],
  ]
  for (const [algorithm, run] of runs) {
    for (const event of run.timeline.events) {
      const [signalKind, signalSequence] = signalColumns(event)
      rows.push([
        algorithm,
        event.timestamp,
        event.eventType,
        event.packet?.sequenceNumber ?? '',
        event.packet?.sizeBytes ?? '',
        event.congestionWindowSegments ?? '',
        event.phase ?? '',
        signalKind,
        signalSequence,
      ])
    }
  }
  return csvRows(rows)
}

/**
 * Run totals, one row per algorithm — the stats rail as a file. This is
 * the §18 off-screen data table in exportable form.
 */
export function buildStatisticsCsv(runs: RunMap): string {
  const rows: (string | number)[][] = [
    [
      'algorithm',
      'throughput_bytes_per_second',
      'packet_delivery_ratio',
      'retransmission_count',
      'average_rtt_seconds',
      'packet_loss_count',
      'peak_congestion_window_segments',
      'duration_seconds',
    ],
  ]
  for (const [algorithm, run] of runs) {
    const series = buildCwndSeries(run.timeline)
    rows.push([
      algorithm,
      run.statistics.throughputBytesPerSecond,
      run.statistics.packetDeliveryRatio,
      run.statistics.retransmissionCount,
      run.statistics.averageRttSeconds,
      run.statistics.packetLossCount,
      series.maxCwnd,
      run.timeline.durationSeconds,
    ])
  }
  return csvRows(rows)
}

/**
 * The complete result set: the configuration that produced it beside
 * every run's timeline and statistics. Re-entering the configuration
 * reproduces the file exactly, because the seed travels with it.
 */
export function buildRunJson(runs: RunMap, config: SimulationFormConfig): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    configuration: {
      ...config,
      bandwidthBytesPerSecond: BANDWIDTH_BYTES_PER_SECOND,
    },
    runs: [...runs].map(([algorithm, run]) => ({
      algorithm,
      timeline: run.timeline,
      statistics: run.statistics,
    })),
  }
  return JSON.stringify(payload, null, 2)
}

/** Stem shared by every file of one export, e.g. `tcp-new_reno-seed42`. */
export function exportFilenameStem(runs: RunMap, config: SimulationFormConfig): string {
  const algorithms = [...runs.keys()]
  const label = algorithms.length === 1 ? (algorithms[0] ?? config.algorithm) : 'comparison'
  return `tcp-${label}-seed${config.seed}`
}
