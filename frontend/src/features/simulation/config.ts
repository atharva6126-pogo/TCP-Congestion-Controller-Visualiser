/**
 * The configuration the user edits, and its mapping onto a simulation
 * request. Bounds mirror the API's, so invalid input is caught before a
 * request is made and the two can never disagree silently.
 */

import type { SimulationRequest } from '../../lib/api/simulations'
import type { AlgorithmName } from './timeline'

export interface SimulationFormConfig {
  algorithm: AlgorithmName
  /** Round-trip time in milliseconds; the link models half of it each way. */
  roundTripTimeMs: number
  lossProbability: number
  totalBytesToTransfer: number
  maximumSegmentSizeBytes: number
  seed: number
}

/**
 * Link capacity is held constant: the visualization is about how the
 * congestion window reacts to delay and loss, and a fixed rate keeps
 * runs comparable.
 */
export const BANDWIDTH_BYTES_PER_SECOND = 1_000_000

/**
 * A default that reads well at 1x: the round-trip time is long enough
 * that window growth is visible in real time, and the loss rate is high
 * enough to produce a sawtooth within one screen.
 */
export const DEFAULT_CONFIG: SimulationFormConfig = {
  algorithm: 'new_reno',
  roundTripTimeMs: 200,
  lossProbability: 0.1,
  totalBytesToTransfer: 40_000,
  maximumSegmentSizeBytes: 1000,
  seed: 42,
}

interface Bounds {
  min: number
  max: number
  label: string
  unit?: string
  step: number
}

export const BOUNDS = {
  roundTripTimeMs: { min: 2, max: 1000, label: 'Round-trip time', unit: 'ms', step: 1 },
  lossProbability: { min: 0, max: 0.5, label: 'Packet loss', unit: '', step: 0.01 },
  totalBytesToTransfer: { min: 1_000, max: 500_000, label: 'Transfer size', unit: 'B', step: 1000 },
  maximumSegmentSizeBytes: {
    min: 500,
    max: 9000,
    label: 'Segment size (MSS)',
    unit: 'B',
    step: 100,
  },
  seed: { min: 0, max: 2 ** 31 - 1, label: 'Seed', step: 1 },
} as const satisfies Record<string, Bounds>

export type ConfigField = keyof typeof BOUNDS

export type ConfigErrors = Partial<Record<ConfigField, string>>

function formatBound(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : String(value)
}

/** Field-level messages stating the rule, never blaming the user (§13). */
export function validateConfig(config: SimulationFormConfig): ConfigErrors {
  const errors: ConfigErrors = {}
  for (const field of Object.keys(BOUNDS) as ConfigField[]) {
    const bound = BOUNDS[field]
    const value = config[field]
    if (!Number.isFinite(value)) {
      errors[field] = `${bound.label} must be a number.`
    } else if (value < bound.min || value > bound.max) {
      errors[field] =
        `${bound.label} must be between ${formatBound(bound.min)} and ${formatBound(bound.max)}.`
    }
  }
  if (Number.isFinite(config.seed) && !Number.isInteger(config.seed)) {
    errors.seed = 'Seed must be a whole number.'
  }
  return errors
}

export function toSimulationRequest(config: SimulationFormConfig): SimulationRequest {
  return {
    algorithm: config.algorithm,
    seed: config.seed,
    bandwidth_bytes_per_second: BANDWIDTH_BYTES_PER_SECOND,
    // The domain models one-way propagation delay.
    latency_ms: config.roundTripTimeMs / 2,
    loss_probability: config.lossProbability,
    total_bytes_to_transfer: config.totalBytesToTransfer,
    maximum_segment_size_bytes: config.maximumSegmentSizeBytes,
  }
}
