/**
 * Pure derivations for both inspectors.
 *
 * Every lookup into the timeline lives here — the event list, the
 * detail panel, and the packet inspector all read the same functions,
 * and all of them are functions of (timeline, cursor) alone.
 */

import { PHASE_LABEL } from '../charts/phases'
import type { Transmission } from '../packets/transmissions'
import type { CongestionSignal, SimulationEvent, SimulationEventType } from '../simulation/timeline'

export const EVENT_TYPE_LABEL: Record<SimulationEventType, string> = {
  packet_sent: 'Sent',
  packet_acknowledged: 'Acknowledged',
  packet_lost: 'Lost',
  congestion_window_changed: 'Window',
}

const SIGNAL_LABEL: Record<CongestionSignal['kind'], string> = {
  ack_received: 'Acknowledgement',
  triple_duplicate_ack: 'Triple duplicate ACK',
  timeout: 'Timeout',
}

/**
 * Index of the last event at or before `t`, or -1 when the cursor sits
 * before the first event. Events are ordered, so this is a binary
 * search — the list re-renders only when this value changes.
 */
export function currentEventIndex(events: readonly SimulationEvent[], t: number): number {
  let low = 0
  let high = events.length - 1
  let result = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    const event = events[mid]
    if (event !== undefined && event.timestamp <= t) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}

export interface DetailRow {
  label: string
  value: string
}

function formatSeconds(value: number): string {
  return `${value.toFixed(3)} s`
}

function signalRows(signal: CongestionSignal): DetailRow[] {
  const rows: DetailRow[] = [{ label: 'Signal', value: SIGNAL_LABEL[signal.kind] }]
  if (signal.kind === 'ack_received') {
    rows.push(
      { label: 'Acknowledged', value: `${signal.acknowledgedSegments} seg` },
      { label: 'ACK sequence', value: signal.ackSequenceNumber.toLocaleString() },
    )
  } else {
    rows.push({
      label: 'Highest sent',
      value: signal.highestTransmittedSequenceNumber.toLocaleString(),
    })
  }
  return rows
}

/** Complete metadata for one timeline event. */
export function describeEvent(event: SimulationEvent): DetailRow[] {
  const rows: DetailRow[] = [
    { label: 'Time', value: formatSeconds(event.timestamp) },
    { label: 'Event', value: EVENT_TYPE_LABEL[event.eventType] },
  ]
  if (event.packet !== undefined) {
    rows.push(
      { label: 'Sequence', value: event.packet.sequenceNumber.toLocaleString() },
      { label: 'Size', value: `${event.packet.sizeBytes.toLocaleString()} B` },
    )
  }
  if (event.congestionWindowSegments !== undefined) {
    rows.push({
      label: 'Window',
      value: `${event.congestionWindowSegments.toFixed(2)} seg`,
    })
  }
  if (event.phase !== undefined) {
    rows.push({ label: 'Phase', value: PHASE_LABEL[event.phase] })
  }
  if (event.signal !== undefined) {
    rows.push(...signalRows(event.signal))
  }
  return rows
}

/** The short summary shown on a row in the event list. */
export function summarizeEvent(event: SimulationEvent): string {
  if (event.packet !== undefined) {
    return `seq ${event.packet.sequenceNumber.toLocaleString()}`
  }
  if (event.congestionWindowSegments !== undefined) {
    const window = `${event.congestionWindowSegments.toFixed(2)} seg`
    return event.phase === undefined ? window : `${window} · ${PHASE_LABEL[event.phase]}`
  }
  return ''
}

/** The loss kind for events that carry one, for shape/label coding. */
export function lossKindOf(event: SimulationEvent): 'triple_duplicate_ack' | 'timeout' | null {
  if (
    event.eventType !== 'packet_lost' ||
    event.signal === undefined ||
    event.signal.kind === 'ack_received'
  ) {
    return null
  }
  return event.signal.kind
}

export function findTransmission(
  transmissions: readonly Transmission[],
  sequenceNumber: number,
  attempt: number,
): Transmission | null {
  return (
    transmissions.find(
      (candidate) => candidate.sequenceNumber === sequenceNumber && candidate.attempt === attempt,
    ) ?? null
  )
}

export interface PacketDetail {
  sequenceNumber: number
  attempt: number
  totalAttempts: number
  rows: DetailRow[]
}

/**
 * Full metadata for one transmission attempt, or `null` when it has not
 * happened yet at time `t` — a packet the replay has not reached is not
 * inspectable.
 */
export function describePacket(
  transmissions: readonly Transmission[],
  sequenceNumber: number,
  attempt: number,
  t: number,
): PacketDetail | null {
  const transmission = findTransmission(transmissions, sequenceNumber, attempt)
  if (transmission === null || transmission.sendTime > t) {
    return null
  }

  const attemptsForSequence = transmissions.filter(
    (candidate) => candidate.sequenceNumber === sequenceNumber,
  )
  const completed = transmission.completionTime <= t
  const delivered = transmission.fate === 'delivered'

  const rows: DetailRow[] = [
    { label: 'Sequence', value: transmission.sequenceNumber.toLocaleString() },
    { label: 'Size', value: `${transmission.sizeBytes.toLocaleString()} B` },
    { label: 'Sent at', value: formatSeconds(transmission.sendTime) },
    {
      label: 'State',
      value: completed ? (delivered ? 'Delivered' : 'Lost') : 'In flight',
    },
    { label: 'Attempt', value: `${transmission.attempt + 1} of ${attemptsForSequence.length}` },
    {
      label: 'Retransmissions',
      value: String(Math.max(attemptsForSequence.length - 1, 0)),
    },
  ]

  if (completed && delivered) {
    rows.push(
      { label: 'Acknowledged at', value: formatSeconds(transmission.completionTime) },
      {
        label: 'Round trip',
        value: `${((transmission.completionTime - transmission.sendTime) * 1000).toFixed(1)} ms`,
      },
    )
  }
  if (completed && transmission.signal !== undefined) {
    rows.push(...signalRows(transmission.signal))
  }

  return {
    sequenceNumber,
    attempt,
    totalAttempts: attemptsForSequence.length,
    rows,
  }
}
