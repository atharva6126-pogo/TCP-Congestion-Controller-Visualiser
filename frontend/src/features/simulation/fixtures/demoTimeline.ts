/**
 * TEMPORARY DEMO FIXTURE — stands in for the simulation API until
 * backend integration. Remove this folder and the single import in
 * Stage.tsx once real runs are fetched.
 *
 * A deterministic New Reno transfer (no randomness anywhere) built to
 * exercise every visual the design spec calls for:
 *
 * - slow start doubling into congestion avoidance,
 * - a triple-duplicate-ACK loss episode: one halving, a fast-recovery
 *   span held across a partial ACK, then linear growth again,
 * - a timeout loss collapsing the window back to one segment,
 * - retransmissions and a cumulative-ACK prefix that stalls at a hole.
 *
 * Window dynamics drive the send pattern, so the congestion window
 * chart and the packet lane describe the same run.
 */

import type { CongestionPhase, SimulationEvent, SimulationTimeline } from '../timeline'

const MSS = 1000
const TOTAL_SEGMENTS = 26
const TOTAL_BYTES = TOTAL_SEGMENTS * MSS
const INITIAL_SSTHRESH = 8
const SEND_SPACING_SECONDS = 0.02
const ROUND_TRIP_SECONDS = 0.4
const ROUND_GAP_SECONDS = 0.12
const TAIL_SECONDS = 0.4

/** `segment:attempt` keys that are dropped, and how the loss is detected. */
const SCRIPTED_LOSSES = new Map<string, 'triple_duplicate_ack' | 'timeout'>([
  ['9:0', 'triple_duplicate_ack'],
  ['12:0', 'triple_duplicate_ack'],
  ['19:0', 'timeout'],
])

interface WindowState {
  cwnd: number
  ssthresh: number
  recoverSequence: number | null
}

function phaseOf(state: WindowState): CongestionPhase {
  if (state.recoverSequence !== null) {
    return 'fast_recovery'
  }
  return state.cwnd < state.ssthresh ? 'slow_start' : 'congestion_avoidance'
}

function buildDemoTimeline(): SimulationTimeline {
  const events: SimulationEvent[] = []
  const state: WindowState = { cwnd: 1, ssthresh: INITIAL_SSTHRESH, recoverSequence: null }
  const pending = Array.from({ length: TOTAL_SEGMENTS }, (_, index) => index)
  const attemptCounts = new Map<number, number>()
  const delivered: boolean[] = Array.from({ length: TOTAL_SEGMENTS }, () => false)
  let ackPrefixSegments = 0
  let highestSentBytes = 0
  let roundStart = 0
  let lastEventTime = 0

  const recordWindow = (time: number) => {
    events.push({
      timestamp: time,
      eventType: 'congestion_window_changed',
      congestionWindowSegments: state.cwnd,
      phase: phaseOf(state),
    })
  }

  recordWindow(0)

  while (pending.length > 0) {
    const batch = pending.splice(0, Math.max(1, Math.floor(state.cwnd)))
    const completions: {
      segment: number
      time: number
      loss: 'triple_duplicate_ack' | 'timeout' | null
    }[] = []

    batch.forEach((segment, index) => {
      const sendTime = roundStart + index * SEND_SPACING_SECONDS
      const attempt = attemptCounts.get(segment) ?? 0
      attemptCounts.set(segment, attempt + 1)
      highestSentBytes = Math.max(highestSentBytes, (segment + 1) * MSS)
      events.push({
        timestamp: sendTime,
        eventType: 'packet_sent',
        packet: { sequenceNumber: segment * MSS, sizeBytes: MSS },
      })
      completions.push({
        segment,
        time: sendTime + ROUND_TRIP_SECONDS,
        loss: SCRIPTED_LOSSES.get(`${segment}:${attempt}`) ?? null,
      })
    })

    for (const completion of completions) {
      const packet = { sequenceNumber: completion.segment * MSS, sizeBytes: MSS }
      lastEventTime = Math.max(lastEventTime, completion.time)

      if (completion.loss !== null) {
        events.push({
          timestamp: completion.time,
          eventType: 'packet_lost',
          packet,
          signal: {
            kind: completion.loss,
            currentTime: completion.time,
            highestTransmittedSequenceNumber: highestSentBytes,
          },
        })
        pending.push(completion.segment)

        if (completion.loss === 'timeout') {
          state.ssthresh = Math.max(state.cwnd / 2, 2)
          state.cwnd = 1
          state.recoverSequence = null
        } else if (state.recoverSequence === null) {
          // New Reno: halve once per episode and hold the window until
          // an acknowledgement covers the recovery point.
          state.ssthresh = Math.max(state.cwnd / 2, 2)
          state.cwnd = state.ssthresh
          state.recoverSequence = highestSentBytes
        }
        recordWindow(completion.time)
        continue
      }

      delivered[completion.segment] = true
      while (ackPrefixSegments < TOTAL_SEGMENTS && delivered[ackPrefixSegments] === true) {
        ackPrefixSegments += 1
      }
      const ackSequenceNumber = Math.min(ackPrefixSegments * MSS, TOTAL_BYTES)
      events.push({
        timestamp: completion.time,
        eventType: 'packet_acknowledged',
        packet,
        signal: {
          kind: 'ack_received',
          acknowledgedSegments: 1,
          currentTime: completion.time,
          ackSequenceNumber,
        },
      })

      if (state.recoverSequence !== null) {
        if (ackSequenceNumber >= state.recoverSequence) {
          state.recoverSequence = null
          recordWindow(completion.time)
        }
        continue
      }
      state.cwnd += state.cwnd < state.ssthresh ? 1 : 1 / state.cwnd
      recordWindow(completion.time)
    }

    roundStart += batch.length * SEND_SPACING_SECONDS + ROUND_TRIP_SECONDS + ROUND_GAP_SECONDS
  }

  return {
    algorithm: 'new_reno',
    maximumSegmentSizeBytes: MSS,
    totalBytesToTransfer: TOTAL_BYTES,
    durationSeconds: lastEventTime + TAIL_SECONDS,
    events,
  }
}

export const DEMO_TIMELINE: SimulationTimeline = buildDemoTimeline()
