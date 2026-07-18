/**
 * Frontend mirror of the backend simulation domain (camelCase). The
 * future API layer maps the service's JSON onto these types; every
 * visualization consumes them together with the ReplayClock cursor.
 */

export type AlgorithmName = 'tahoe' | 'reno' | 'new_reno' | 'cubic'

export type SimulationEventType =
  'packet_sent' | 'packet_acknowledged' | 'packet_lost' | 'congestion_window_changed'

export interface PacketRef {
  /** Byte offset of the packet's first byte in the stream. */
  sequenceNumber: number
  sizeBytes: number
}

export type CongestionSignal =
  | {
      kind: 'ack_received'
      acknowledgedSegments: number
      currentTime: number
      ackSequenceNumber: number
    }
  | { kind: 'triple_duplicate_ack'; currentTime: number; highestTransmittedSequenceNumber: number }
  | { kind: 'timeout'; currentTime: number; highestTransmittedSequenceNumber: number }

export interface SimulationEvent {
  timestamp: number
  eventType: SimulationEventType
  packet?: PacketRef
  congestionWindowSegments?: number
  signal?: CongestionSignal
}

export interface SimulationTimeline {
  algorithm: AlgorithmName
  maximumSegmentSizeBytes: number
  totalBytesToTransfer: number
  /** Replay duration in simulation seconds (≥ the last event timestamp). */
  durationSeconds: number
  /** Ordered by non-decreasing timestamp. */
  events: readonly SimulationEvent[]
}

/** Distinct event timestamps in ascending order, for replay stepping. */
export function uniqueEventTimestamps(events: readonly SimulationEvent[]): number[] {
  return [...new Set(events.map((event) => event.timestamp))].sort((a, b) => a - b)
}

/** The largest timestamp ≤ t, or 0 — used by reduced-motion stepping. */
export function latestTimestampAtOrBefore(sortedTimestamps: readonly number[], t: number): number {
  let low = 0
  let high = sortedTimestamps.length - 1
  let result = 0
  while (low <= high) {
    const mid = (low + high) >> 1
    const value = sortedTimestamps[mid]
    if (value !== undefined && value <= t) {
      result = value
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}
