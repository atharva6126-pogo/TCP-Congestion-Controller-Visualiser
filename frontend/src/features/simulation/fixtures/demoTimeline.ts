/**
 * TEMPORARY DEMO FIXTURE — stands in for the simulation API until
 * backend integration. Remove this folder and the single import in
 * Stage.tsx once real runs are fetched.
 *
 * Fully deterministic: a fixed-window (4 segment) transfer of 12
 * segments with two scripted first-attempt losses (segments 5 and 9),
 * so the lane shows deliveries, in-flight packets, losses,
 * retransmissions, and a cumulative-ACK prefix that stalls at the
 * first hole and recovers. No randomness anywhere.
 */

import type { SimulationEvent, SimulationTimeline } from '../timeline'

const MSS = 1000
const TOTAL_SEGMENTS = 12
const TOTAL_BYTES = TOTAL_SEGMENTS * MSS
const WINDOW = 4
const SEND_SPACING_SECONDS = 0.05
const ATTEMPT_DURATION_SECONDS = 0.4
const ROUND_GAP_SECONDS = 0.2
const TAIL_SECONDS = 0.3
const SCRIPTED_LOSSES = new Set(['5:0', '9:0'])

function buildDemoTimeline(): SimulationTimeline {
  const events: SimulationEvent[] = []
  const pending = Array.from({ length: TOTAL_SEGMENTS }, (_, index) => index)
  const attemptCounts = new Map<number, number>()
  const delivered: boolean[] = Array.from({ length: TOTAL_SEGMENTS }, () => false)
  let ackPrefixSegments = 0
  let highestSentBytes = 0
  let roundStart = 0
  let lastCompletion = 0

  while (pending.length > 0) {
    const batch = pending.splice(0, WINDOW)
    const completions: { segment: number; time: number; lost: boolean }[] = []

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
        time: sendTime + ATTEMPT_DURATION_SECONDS,
        lost: SCRIPTED_LOSSES.has(`${segment}:${attempt}`),
      })
    })

    for (const completion of completions) {
      const packet = { sequenceNumber: completion.segment * MSS, sizeBytes: MSS }
      lastCompletion = completion.time
      if (completion.lost) {
        events.push({
          timestamp: completion.time,
          eventType: 'packet_lost',
          packet,
          signal: {
            kind: 'timeout',
            currentTime: completion.time,
            highestTransmittedSequenceNumber: highestSentBytes,
          },
        })
        pending.push(completion.segment)
      } else {
        delivered[completion.segment] = true
        while (ackPrefixSegments < TOTAL_SEGMENTS && delivered[ackPrefixSegments] === true) {
          ackPrefixSegments += 1
        }
        events.push({
          timestamp: completion.time,
          eventType: 'packet_acknowledged',
          packet,
          signal: {
            kind: 'ack_received',
            acknowledgedSegments: 1,
            currentTime: completion.time,
            ackSequenceNumber: Math.min(ackPrefixSegments * MSS, TOTAL_BYTES),
          },
        })
      }
    }

    roundStart += batch.length * SEND_SPACING_SECONDS + ATTEMPT_DURATION_SECONDS + ROUND_GAP_SECONDS
  }

  return {
    algorithm: 'reno',
    maximumSegmentSizeBytes: MSS,
    totalBytesToTransfer: TOTAL_BYTES,
    durationSeconds: lastCompletion + TAIL_SECONDS,
    events,
  }
}

export const DEMO_TIMELINE: SimulationTimeline = buildDemoTimeline()
