import type { LossKind } from './cwndSeries'

interface LossMarkerShapeProps {
  kind: LossKind
  /** Supplied by Recharts when used as a ReferenceDot shape. */
  cx?: number
  cy?: number
}

/**
 * Loss markers encode their kind by shape, never by color alone
 * (DESIGN_SPEC §14, §18): a hollow diamond for a timeout, a hollow
 * triangle for a triple-duplicate-ACK loss.
 */
export function LossMarkerShape({ kind, cx, cy }: LossMarkerShapeProps) {
  if (cx === undefined || cy === undefined) {
    return null
  }
  const size = 5
  const points =
    kind === 'timeout'
      ? `${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`
      : `${cx},${cy - size} ${cx + size},${cy + size} ${cx - size},${cy + size}`

  return (
    <polygon
      points={points}
      fill="var(--surface-canvas)"
      stroke="var(--status-danger)"
      strokeWidth={1.5}
    />
  )
}
