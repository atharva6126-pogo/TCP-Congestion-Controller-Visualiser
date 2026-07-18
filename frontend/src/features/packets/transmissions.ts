/**
 * Pure derivations for the packet lane (DESIGN_SPEC §16).
 *
 * Everything here is a pure function of the timeline and the replay
 * cursor: nothing stores mutable UI state, so rendering is
 * deterministic and automatically correct after seek, speed changes,
 * pause, and completion.
 */

import type { CongestionSignal, SimulationEvent } from '../simulation/timeline'

/** One transmission attempt of one segment, paired send-to-completion. */
export interface Transmission {
  sequenceNumber: number
  sizeBytes: number
  /** 0 for the first attempt; > 0 marks a retransmission. */
  attempt: number
  sendTime: number
  completionTime: number
  fate: 'delivered' | 'lost'
  /** The signal that completed this attempt: the ACK, or the loss observation. */
  signal: CongestionSignal | undefined
}

/**
 * Pair PACKET_SENT events with their completion (ACK or loss) per
 * sequence number, FIFO — the same rule the backend statistics
 * collector uses. Attempts still unresolved at the end of the timeline
 * are dropped (complete timelines always resolve every attempt).
 */
export function buildTransmissions(events: readonly SimulationEvent[]): readonly Transmission[] {
  const inFlight = new Map<number, { sendTime: number; attempt: number }[]>()
  const attemptCounts = new Map<number, number>()
  const transmissions: Transmission[] = []

  for (const event of events) {
    const packet = event.packet
    if (packet === undefined) {
      continue
    }
    if (event.eventType === 'packet_sent') {
      const attempt = attemptCounts.get(packet.sequenceNumber) ?? 0
      attemptCounts.set(packet.sequenceNumber, attempt + 1)
      const queue = inFlight.get(packet.sequenceNumber) ?? []
      queue.push({ sendTime: event.timestamp, attempt })
      inFlight.set(packet.sequenceNumber, queue)
    } else if (event.eventType === 'packet_acknowledged' || event.eventType === 'packet_lost') {
      const started = inFlight.get(packet.sequenceNumber)?.shift()
      if (started === undefined) {
        continue
      }
      transmissions.push({
        sequenceNumber: packet.sequenceNumber,
        sizeBytes: packet.sizeBytes,
        attempt: started.attempt,
        sendTime: started.sendTime,
        completionTime: event.timestamp,
        fate: event.eventType === 'packet_acknowledged' ? 'delivered' : 'lost',
        signal: event.signal,
      })
    }
  }

  return transmissions
}

/**
 * Fraction of an attempt's duration spent on the sender→receiver data
 * leg; the remainder is the returning ACK. A visual convention — the
 * engine models one round trip per attempt without separating legs.
 */
export const DATA_LEG_FRACTION = 0.6
/** A loss mark fades from full opacity to its scar level over this long. */
export const LOSS_MARK_FADE_SECONDS = 1.5
export const LOSS_SCAR_OPACITY = 0.2

export type PacketVisual =
  | { kind: 'hidden' }
  | { kind: 'data'; progress: number; retransmission: boolean }
  | { kind: 'ack'; progress: number }
  | { kind: 'loss'; opacity: number }

/** The visual state of one transmission at replay time `t`. */
export function packetVisualAt(transmission: Transmission, t: number): PacketVisual {
  const { sendTime, completionTime, fate, attempt } = transmission
  if (t < sendTime) {
    return { kind: 'hidden' }
  }
  const dataLegEnd = sendTime + DATA_LEG_FRACTION * (completionTime - sendTime)
  if (t <= dataLegEnd) {
    return {
      kind: 'data',
      progress: (t - sendTime) / (dataLegEnd - sendTime),
      retransmission: attempt > 0,
    }
  }
  if (fate === 'delivered') {
    if (t < completionTime) {
      return { kind: 'ack', progress: (t - dataLegEnd) / (completionTime - dataLegEnd) }
    }
    return { kind: 'hidden' }
  }
  const sinceLoss = t - dataLegEnd
  const opacity =
    sinceLoss >= LOSS_MARK_FADE_SECONDS
      ? LOSS_SCAR_OPACITY
      : 1 - (1 - LOSS_SCAR_OPACITY) * (sinceLoss / LOSS_MARK_FADE_SECONDS)
  return { kind: 'loss', opacity }
}

export type SegmentState = 'delivered' | 'in_flight' | 'lost' | 'unsent'

/** A maximal run of adjacent segments sharing one state at time `t`. */
export interface SegmentRun {
  startSegment: number
  /** Exclusive. */
  endSegment: number
  state: SegmentState
}

/**
 * Sequence-strip state (§16): the byte stream as delivered / in-flight /
 * lost-hole / unsent runs as of replay time `t`. Delivered wins over
 * in-flight (a retransmission of an already-delivered segment cannot
 * regress it), in-flight over lost.
 */
export function segmentRunsAt(
  transmissions: readonly Transmission[],
  totalSegments: number,
  maximumSegmentSizeBytes: number,
  t: number,
): SegmentRun[] {
  const states: SegmentState[] = Array.from({ length: totalSegments }, () => 'unsent')

  for (const transmission of transmissions) {
    const segment = Math.floor(transmission.sequenceNumber / maximumSegmentSizeBytes)
    const current = states[segment]
    if (current === undefined || current === 'delivered') {
      continue
    }
    if (transmission.fate === 'delivered' && transmission.completionTime <= t) {
      states[segment] = 'delivered'
    } else if (transmission.sendTime <= t && t < transmission.completionTime) {
      states[segment] = 'in_flight'
    } else if (transmission.fate === 'lost' && transmission.completionTime <= t) {
      if (current !== 'in_flight') {
        states[segment] = 'lost'
      }
    }
  }

  const runs: SegmentRun[] = []
  for (let segment = 0; segment < totalSegments; segment += 1) {
    const state = states[segment]
    if (state === undefined) {
      continue
    }
    const last = runs.at(-1)
    if (last !== undefined && last.state === state && last.endSegment === segment) {
      last.endSegment = segment + 1
    } else {
      runs.push({ startSegment: segment, endSegment: segment + 1, state })
    }
  }
  return runs
}
