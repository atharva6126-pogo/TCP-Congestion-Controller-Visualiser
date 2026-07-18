import type { CongestionPhase } from '../simulation/timeline'
import { PHASE_LABEL } from './phases'

interface CwndTooltipProps {
  /** Recharts supplies these; typed narrowly rather than with its generics. */
  active?: boolean
  label?: string | number
  payload?: readonly { value?: number | string | null }[]
  phaseAt: (time: number) => CongestionPhase | null
}

/** Hover inspection for the congestion window chart (DESIGN_SPEC §14). */
export function CwndTooltip({ active, label, payload, phaseAt }: CwndTooltipProps) {
  if (active !== true || typeof label !== 'number') {
    return null
  }
  const value = payload?.find((entry) => typeof entry.value === 'number')?.value
  if (typeof value !== 'number') {
    return null
  }
  const phase = phaseAt(label)

  return (
    <div className="rounded border border-edge bg-raised px-3 py-2 shadow-lg">
      <dl className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-6">
          <dt className="text-label text-fg-muted">Time</dt>
          <dd className="font-mono text-axis text-fg">{label.toFixed(3)} s</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6">
          <dt className="text-label text-fg-muted">Window</dt>
          <dd className="font-mono text-axis text-fg">
            {value.toFixed(2)} <span className="text-fg-muted">seg</span>
          </dd>
        </div>
        {phase !== null && (
          <div className="flex items-baseline justify-between gap-6">
            <dt className="text-label text-fg-muted">Phase</dt>
            <dd className="text-axis text-fg">{PHASE_LABEL[phase]}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
