import type { AlgorithmName } from './timeline'

/** Canonical order, oldest algorithm first — used by every selector and legend. */
export const ALGORITHM_ORDER: readonly AlgorithmName[] = ['tahoe', 'reno', 'new_reno', 'cubic']

/**
 * Algorithm identity colors (DESIGN_SPEC §7) — fixed forever and
 * colorblind-safe. Defined once here so every visualization draws the
 * same algorithm in the same color.
 */

/** For SVG attributes and Recharts props, which take raw color strings. */
export const ALGORITHM_COLOR_VAR: Record<AlgorithmName, string> = {
  tahoe: 'var(--algo-tahoe)',
  reno: 'var(--algo-reno)',
  new_reno: 'var(--algo-new-reno)',
  cubic: 'var(--algo-cubic)',
}

/** For elements styled through Tailwind's token-backed utilities. */
export const ALGORITHM_TEXT_CLASS: Record<AlgorithmName, string> = {
  tahoe: 'text-algo-tahoe',
  reno: 'text-algo-reno',
  new_reno: 'text-algo-new-reno',
  cubic: 'text-algo-cubic',
}

export const ALGORITHM_LABEL: Record<AlgorithmName, string> = {
  tahoe: 'TCP Tahoe',
  reno: 'TCP Reno',
  new_reno: 'TCP New Reno',
  cubic: 'TCP Cubic',
}
