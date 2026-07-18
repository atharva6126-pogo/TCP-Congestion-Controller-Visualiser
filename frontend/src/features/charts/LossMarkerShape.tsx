import type { LossKind } from './cwndSeries'

interface LossMarkerShapeProps {
  kind: LossKind
  /** Half-height of the glyph; comparison overlays draw them smaller (§15). */
  size?: number
  /** Supplied by Recharts when used as a ReferenceDot shape. */
  cx?: number
  cy?: number
}

/**
 * Loss markers encode their kind by shape, never by color alone
 * (DESIGN_SPEC §14, §18): a hollow diamond for a timeout, a hollow
 * triangle for a triple-duplicate-ACK loss.
 */
export function LossMarkerShape({ kind, size = 5, cx, cy }: LossMarkerShapeProps) {
  if (cx === undefined || cy === undefined) {
    return null
  }
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
