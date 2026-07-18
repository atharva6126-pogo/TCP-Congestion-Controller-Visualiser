import type { CongestionPhase } from '../simulation/timeline'

/** Phase presentation (DESIGN_SPEC §7, §14). */

export const PHASE_LABEL: Record<CongestionPhase, string> = {
  slow_start: 'Slow start',
  congestion_avoidance: 'Congestion avoidance',
  fast_recovery: 'Fast recovery',
}

/** Short band labels drawn at the top edge of the chart. */
export const PHASE_SHORT_LABEL: Record<CongestionPhase, string> = {
  slow_start: 'SS',
  congestion_avoidance: 'CA',
  fast_recovery: 'FR',
}

/**
 * Band tints; congestion avoidance is neutral so the two eventful
 * phases carry the only hue (§7).
 */
export const PHASE_BAND_FILL: Record<CongestionPhase, string> = {
  slow_start: 'var(--phase-slow-start)',
  congestion_avoidance: 'var(--fg-faint)',
  fast_recovery: 'var(--phase-fast-recovery)',
}

export const PHASE_BAND_OPACITY: Record<CongestionPhase, number> = {
  slow_start: 0.07,
  congestion_avoidance: 0.04,
  fast_recovery: 0.08,
}
