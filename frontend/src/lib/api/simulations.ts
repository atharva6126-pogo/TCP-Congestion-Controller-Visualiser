/**
 * The simulation endpoint: wire types and the single mapping between
 * them and the frontend's timeline model. Nothing else in the app
 * touches the snake_case wire shape.
 */

import type {
  AlgorithmName,
  CongestionPhase,
  CongestionSignal,
  SimulationEvent,
  SimulationEventType,
  SimulationTimeline,
} from '../../features/simulation/timeline'
import { requestJson } from './client'

export interface SimulationRequest {
  algorithm: AlgorithmName
  seed: number
  bandwidth_bytes_per_second: number
  latency_ms: number
  loss_probability: number
  total_bytes_to_transfer: number
  maximum_segment_size_bytes: number
}

export interface SimulationStatistics {
  throughputBytesPerSecond: number
  packetDeliveryRatio: number
  retransmissionCount: number
  averageRttSeconds: number
  packetLossCount: number
}

export interface SimulationRun {
  timeline: SimulationTimeline
  statistics: SimulationStatistics
}

interface WirePacket {
  sequence_number: number
  size_bytes: number
}

interface WireSignal {
  kind: 'ack_received' | 'triple_duplicate_ack' | 'timeout'
  current_time: number
  acknowledged_segments: number | null
  ack_sequence_number: number | null
  highest_transmitted_sequence_number: number | null
}

interface WireEvent {
  timestamp: number
  event_type: SimulationEventType
  packet: WirePacket | null
  congestion_window_segments: number | null
  phase: CongestionPhase | null
  signal: WireSignal | null
}

interface WireResponse {
  algorithm: AlgorithmName
  seed: number
  total_bytes_to_transfer: number
  maximum_segment_size_bytes: number
  duration_seconds: number
  events: WireEvent[]
  statistics: {
    throughput_bytes_per_second: number
    packet_delivery_ratio: number
    retransmission_count: number
    average_rtt_seconds: number
    packet_loss_count: number
  }
}

function toSignal(wire: WireSignal): CongestionSignal | undefined {
  if (wire.kind === 'ack_received') {
    if (wire.acknowledged_segments === null || wire.ack_sequence_number === null) {
      return undefined
    }
    return {
      kind: 'ack_received',
      acknowledgedSegments: wire.acknowledged_segments,
      currentTime: wire.current_time,
      ackSequenceNumber: wire.ack_sequence_number,
    }
  }
  if (wire.highest_transmitted_sequence_number === null) {
    return undefined
  }
  return {
    kind: wire.kind,
    currentTime: wire.current_time,
    highestTransmittedSequenceNumber: wire.highest_transmitted_sequence_number,
  }
}

function toEvent(wire: WireEvent): SimulationEvent {
  return {
    timestamp: wire.timestamp,
    eventType: wire.event_type,
    ...(wire.packet === null
      ? {}
      : {
          packet: {
            sequenceNumber: wire.packet.sequence_number,
            sizeBytes: wire.packet.size_bytes,
          },
        }),
    ...(wire.congestion_window_segments === null
      ? {}
      : { congestionWindowSegments: wire.congestion_window_segments }),
    ...(wire.phase === null ? {} : { phase: wire.phase }),
    ...(wire.signal === null ? {} : { signal: toSignal(wire.signal) }),
  }
}

export async function postSimulation(request: SimulationRequest): Promise<SimulationRun> {
  const response = await requestJson<WireResponse>('/simulations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  return {
    timeline: {
      algorithm: response.algorithm,
      maximumSegmentSizeBytes: response.maximum_segment_size_bytes,
      totalBytesToTransfer: response.total_bytes_to_transfer,
      durationSeconds: response.duration_seconds,
      events: response.events.map(toEvent),
    },
    statistics: {
      throughputBytesPerSecond: response.statistics.throughput_bytes_per_second,
      packetDeliveryRatio: response.statistics.packet_delivery_ratio,
      retransmissionCount: response.statistics.retransmission_count,
      averageRttSeconds: response.statistics.average_rtt_seconds,
      packetLossCount: response.statistics.packet_loss_count,
    },
  }
}
