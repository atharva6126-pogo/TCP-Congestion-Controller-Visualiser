/**
 * The workspace state carried in the URL query string (DESIGN_SPEC §6).
 *
 * Determinism is a product feature: the config and the seed fully
 * determine a run, so encoding them makes any run shareable and
 * reproducible. Parsing is total — a malformed or hostile query string
 * yields defaults rather than an error, because a bad link must still
 * open a usable workspace.
 */

import { ALGORITHM_ORDER } from './algorithmColors'
import { BOUNDS, DEFAULT_CONFIG } from './config'
import type { SimulationFormConfig } from './config'
import type { ComparisonView, ViewMode } from './SimulationContext'
import type { AlgorithmName } from './timeline'

export interface SharedState {
  config: SimulationFormConfig
  mode: ViewMode
  comparisonAlgorithms: readonly AlgorithmName[]
  comparisonView: ComparisonView
}

export const DEFAULT_SHARED_STATE: SharedState = {
  config: DEFAULT_CONFIG,
  mode: 'single',
  comparisonAlgorithms: ALGORITHM_ORDER,
  comparisonView: 'overlay',
}

/** Short, stable parameter names — they appear in shared links. */
const PARAM = {
  algorithm: 'algo',
  roundTripTimeMs: 'rtt',
  lossProbability: 'loss',
  totalBytesToTransfer: 'bytes',
  maximumSegmentSizeBytes: 'mss',
  seed: 'seed',
  mode: 'mode',
  comparisonAlgorithms: 'cmp',
  comparisonView: 'view',
} as const

function isAlgorithm(value: string): value is AlgorithmName {
  return (ALGORITHM_ORDER as readonly string[]).includes(value)
}

/**
 * A number within its field's bounds, or the default. Out-of-range and
 * non-numeric values are rejected together: the URL must never seed the
 * form with a value the user could not have typed.
 */
function readNumber(
  params: URLSearchParams,
  key: string,
  field: keyof typeof BOUNDS,
  fallback: number,
): number {
  const raw = params.get(key)
  if (raw === null || raw.trim() === '') {
    return fallback
  }
  const value = Number(raw)
  const bound = BOUNDS[field]
  if (!Number.isFinite(value) || value < bound.min || value > bound.max) {
    return fallback
  }
  return value
}

export function parseSharedState(search: string): SharedState {
  const params = new URLSearchParams(search)
  const defaults = DEFAULT_SHARED_STATE

  const algorithmParam = params.get(PARAM.algorithm)
  const algorithm =
    algorithmParam !== null && isAlgorithm(algorithmParam)
      ? algorithmParam
      : defaults.config.algorithm

  const seed = readNumber(params, PARAM.seed, 'seed', defaults.config.seed)

  const config: SimulationFormConfig = {
    algorithm,
    roundTripTimeMs: readNumber(
      params,
      PARAM.roundTripTimeMs,
      'roundTripTimeMs',
      defaults.config.roundTripTimeMs,
    ),
    lossProbability: readNumber(
      params,
      PARAM.lossProbability,
      'lossProbability',
      defaults.config.lossProbability,
    ),
    totalBytesToTransfer: readNumber(
      params,
      PARAM.totalBytesToTransfer,
      'totalBytesToTransfer',
      defaults.config.totalBytesToTransfer,
    ),
    maximumSegmentSizeBytes: readNumber(
      params,
      PARAM.maximumSegmentSizeBytes,
      'maximumSegmentSizeBytes',
      defaults.config.maximumSegmentSizeBytes,
    ),
    seed: Number.isInteger(seed) ? seed : defaults.config.seed,
  }

  const mode: ViewMode = params.get(PARAM.mode) === 'comparison' ? 'comparison' : 'single'
  const comparisonView: ComparisonView =
    params.get(PARAM.comparisonView) === 'small_multiples' ? 'small_multiples' : 'overlay'

  // Canonical order regardless of how the link listed them, so the
  // legend and the table always read the same way.
  const requested = (params.get(PARAM.comparisonAlgorithms) ?? '').split(',').filter(isAlgorithm)
  const comparisonAlgorithms =
    requested.length > 0
      ? ALGORITHM_ORDER.filter((entry) => requested.includes(entry))
      : defaults.comparisonAlgorithms

  return { config, mode, comparisonAlgorithms, comparisonView }
}

/** `true` when the query string carries at least one recognized parameter. */
export function hasSharedState(search: string): boolean {
  const params = new URLSearchParams(search)
  return Object.values(PARAM).some((key) => params.has(key))
}

/** The query string for a state, including the leading `?`. */
export function buildShareSearch(state: SharedState): string {
  const params = new URLSearchParams()
  params.set(PARAM.algorithm, state.config.algorithm)
  params.set(PARAM.roundTripTimeMs, String(state.config.roundTripTimeMs))
  params.set(PARAM.lossProbability, String(state.config.lossProbability))
  params.set(PARAM.totalBytesToTransfer, String(state.config.totalBytesToTransfer))
  params.set(PARAM.maximumSegmentSizeBytes, String(state.config.maximumSegmentSizeBytes))
  params.set(PARAM.seed, String(state.config.seed))
  params.set(PARAM.mode, state.mode)
  // Only meaningful in comparison mode; omitted otherwise to keep
  // single-run links short.
  if (state.mode === 'comparison') {
    params.set(PARAM.comparisonAlgorithms, state.comparisonAlgorithms.join(','))
    params.set(PARAM.comparisonView, state.comparisonView)
  }
  return `?${params.toString()}`
}

/** The absolute link to the current state, for the share control. */
export function buildShareUrl(state: SharedState): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}${buildShareSearch(state)}`
}
