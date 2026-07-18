import { useMemo } from 'react'

import { useReplayClock } from '../replay/useReplayClock'
import { latestTimestampAtOrBefore, uniqueEventTimestamps } from '../simulation/timeline'
import type { AlgorithmName, SimulationTimeline } from '../simulation/timeline'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { buildTransmissions, packetVisualAt, segmentRunsAt } from './transmissions'
import type { PacketVisual, SegmentState, Transmission } from './transmissions'

type VisibleVisual = Exclude<PacketVisual, { kind: 'hidden' }>

interface VisiblePacket {
  transmission: Transmission
  visual: VisibleVisual
}

/*
 * Geometry (SVG user units; the viewBox scales responsively, §17).
 * One lane band with the outbound data track and the returning ACK
 * track, endpoint bars for sender/receiver, and the sequence strip
 * mapping the byte stream underneath (§16).
 */
const VIEW_WIDTH = 800
const VIEW_HEIGHT = 190
const SENDER_X = 64
const RECEIVER_X = 736
const SPAN = RECEIVER_X - SENDER_X
const LANE_TOP = 28
const LANE_BOTTOM = 128
const DATA_Y = 62
const ACK_Y = 100
const STRIP_TOP = 150
const STRIP_HEIGHT = 14
const DATA_RADIUS = 6
const ACK_RADIUS = 4
/** Legibility cap from §16; beyond this, density aggregation is future work. */
const MAX_RENDERED_PACKETS = 60

const ALGORITHM_TEXT_CLASS: Record<AlgorithmName, string> = {
  tahoe: 'text-algo-tahoe',
  reno: 'text-algo-reno',
  new_reno: 'text-algo-new-reno',
  cubic: 'text-algo-cubic',
}

const SEGMENT_FILL: Record<SegmentState, string> = {
  delivered: 'currentColor',
  in_flight: 'url(#lane-hatch)',
  lost: 'var(--status-danger)',
  unsent: 'var(--surface-raised)',
}

const SEGMENT_OPACITY: Record<SegmentState, number> = {
  delivered: 0.9,
  in_flight: 1,
  lost: 0.45,
  unsent: 1,
}

interface PacketLaneProps {
  timeline: SimulationTimeline
}

/**
 * The §16 packet flight lane. Every rendered position is a pure
 * function of (timeline, replay cursor); the component holds no state
 * and runs no timers, so seek, speed changes, pause, and completion
 * are correct by construction. With reduced motion, positions snap to
 * the state at the latest event timestamp instead of interpolating.
 */
export function PacketLane({ timeline }: PacketLaneProps) {
  const { currentTime } = useReplayClock()
  const reducedMotion = useReducedMotion()

  const transmissions = useMemo(() => buildTransmissions(timeline.events), [timeline])
  const eventTimestamps = useMemo(() => uniqueEventTimestamps(timeline.events), [timeline])
  const totalSegments = Math.ceil(timeline.totalBytesToTransfer / timeline.maximumSegmentSizeBytes)

  const t = reducedMotion ? latestTimestampAtOrBefore(eventTimestamps, currentTime) : currentTime

  const visible = transmissions
    .map((transmission) => ({ transmission, visual: packetVisualAt(transmission, t) }))
    .filter((entry): entry is VisiblePacket => entry.visual.kind !== 'hidden')
    .slice(0, MAX_RENDERED_PACKETS)

  const runs = segmentRunsAt(transmissions, totalSegments, timeline.maximumSegmentSizeBytes, t)
  const stripX = (byte: number) => SENDER_X + (byte / timeline.totalBytesToTransfer) * SPAN

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className={`w-full ${ALGORITHM_TEXT_CLASS[timeline.algorithm]}`}
      role="img"
      aria-label={`Packet transmissions between sender and receiver (${timeline.algorithm})`}
    >
      <defs>
        <pattern
          id="lane-hatch"
          width="5"
          height="5"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="5" stroke="var(--fg-muted)" strokeWidth="1.5" />
        </pattern>
      </defs>

      {/* Endpoints */}
      <text x={SENDER_X} y={16} fontSize={10} letterSpacing="0.06em" className="fill-fg-faint">
        SENDER
      </text>
      <text
        x={RECEIVER_X}
        y={16}
        fontSize={10}
        letterSpacing="0.06em"
        textAnchor="end"
        className="fill-fg-faint"
      >
        RECEIVER
      </text>
      <line
        x1={SENDER_X}
        y1={LANE_TOP}
        x2={SENDER_X}
        y2={LANE_BOTTOM}
        stroke="var(--border-hairline)"
        strokeWidth="2"
      />
      <line
        x1={RECEIVER_X}
        y1={LANE_TOP}
        x2={RECEIVER_X}
        y2={LANE_BOTTOM}
        stroke="var(--border-hairline)"
        strokeWidth="2"
      />

      {/* Tracks */}
      <line
        x1={SENDER_X}
        y1={DATA_Y}
        x2={RECEIVER_X}
        y2={DATA_Y}
        stroke="var(--border-hairline)"
        strokeWidth="1"
        strokeDasharray="1 5"
      />
      <line
        x1={SENDER_X}
        y1={ACK_Y}
        x2={RECEIVER_X}
        y2={ACK_Y}
        stroke="var(--border-hairline)"
        strokeWidth="1"
        strokeDasharray="1 5"
      />

      {/* Packets */}
      {visible.map(({ transmission, visual }) => (
        <PacketGlyph
          key={`${transmission.sequenceNumber}:${transmission.attempt}`}
          transmission={transmission}
          visual={visual}
        />
      ))}

      {/* Sequence strip (§16): the byte stream as of the cursor. */}
      {runs.map((run) => {
        const startByte = run.startSegment * timeline.maximumSegmentSizeBytes
        const endByte = Math.min(
          run.endSegment * timeline.maximumSegmentSizeBytes,
          timeline.totalBytesToTransfer,
        )
        return (
          <rect
            key={run.startSegment}
            x={stripX(startByte)}
            y={STRIP_TOP}
            width={stripX(endByte) - stripX(startByte)}
            height={STRIP_HEIGHT}
            fill={SEGMENT_FILL[run.state]}
            opacity={SEGMENT_OPACITY[run.state]}
          />
        )
      })}
      <rect
        x={SENDER_X}
        y={STRIP_TOP}
        width={SPAN}
        height={STRIP_HEIGHT}
        fill="none"
        stroke="var(--border-hairline)"
        strokeWidth="1"
      />
      <text
        x={SENDER_X}
        y={STRIP_TOP + STRIP_HEIGHT + 14}
        fontSize={9}
        className="fill-fg-faint font-mono"
      >
        0
      </text>
      <text
        x={RECEIVER_X}
        y={STRIP_TOP + STRIP_HEIGHT + 14}
        fontSize={9}
        textAnchor="end"
        className="fill-fg-faint font-mono"
      >
        {timeline.totalBytesToTransfer.toLocaleString()} B
      </text>
    </svg>
  )
}

function PacketGlyph({ transmission, visual }: VisiblePacket) {
  const describe = `seq ${transmission.sequenceNumber} · ${transmission.sizeBytes} B · attempt ${
    transmission.attempt + 1
  } · ${transmission.fate}`

  if (visual.kind === 'data') {
    return (
      <circle
        cx={SENDER_X + visual.progress * SPAN}
        cy={DATA_Y}
        r={DATA_RADIUS}
        fill="currentColor"
        stroke={visual.retransmission ? 'var(--status-danger)' : 'none'}
        strokeWidth={visual.retransmission ? 1.5 : 0}
      >
        <title>{describe}</title>
      </circle>
    )
  }
  if (visual.kind === 'ack') {
    return (
      <circle
        cx={RECEIVER_X - visual.progress * SPAN}
        cy={ACK_Y}
        r={ACK_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <title>{`ack for ${describe}`}</title>
      </circle>
    )
  }
  // Loss mark: an ✕ at the point the data leg ended, offset per
  // sequence so simultaneous scars stay distinguishable.
  const x = RECEIVER_X - 18
  const y =
    DATA_Y + ((Math.floor(transmission.sequenceNumber / transmission.sizeBytes) % 3) - 1) * 14
  return (
    <g
      stroke="var(--status-danger)"
      strokeWidth="1.5"
      opacity={visual.opacity}
      transform={`translate(${x} ${y})`}
    >
      <line x1="-5" y1="-5" x2="5" y2="5" />
      <line x1="-5" y1="5" x2="5" y2="-5" />
      <title>{`lost: ${describe}`}</title>
    </g>
  )
}
