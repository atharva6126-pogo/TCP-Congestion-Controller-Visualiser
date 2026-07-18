import { useId } from 'react'

import { SectionLabel } from '../../components/ui/SectionLabel'
import { ALGORITHM_LABEL } from './algorithmColors'
import { BOUNDS } from './config'
import { NumberField } from './NumberField'
import type { AlgorithmName } from './timeline'
import { useSimulation } from './useSimulation'

const ALGORITHMS: readonly AlgorithmName[] = ['tahoe', 'reno', 'new_reno', 'cubic']

/** The simulation configuration form (DESIGN_SPEC §4 config rail). */
export function ConfigPanel() {
  const { config, setConfigValue, errors, isRunning, showLoading, runSimulation, firstErrorField } =
    useSimulation()
  const algorithmId = useId()
  const hasErrors = firstErrorField !== null

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        runSimulation()
      }}
    >
      <SectionLabel>Simulation</SectionLabel>

      <div className="flex flex-col gap-1">
        <label htmlFor={algorithmId} className="text-label text-fg-muted">
          Algorithm
        </label>
        <select
          id={algorithmId}
          value={config.algorithm}
          onChange={(event) => {
            setConfigValue('algorithm', event.target.value as AlgorithmName)
          }}
          className="rounded border border-edge bg-raised px-2 py-1.5 text-ui text-fg"
        >
          {ALGORITHMS.map((algorithm) => (
            <option key={algorithm} value={algorithm}>
              {ALGORITHM_LABEL[algorithm]}
            </option>
          ))}
        </select>
      </div>

      <NumberField
        label={BOUNDS.roundTripTimeMs.label}
        unit={BOUNDS.roundTripTimeMs.unit}
        min={BOUNDS.roundTripTimeMs.min}
        max={BOUNDS.roundTripTimeMs.max}
        step={BOUNDS.roundTripTimeMs.step}
        value={config.roundTripTimeMs}
        error={errors.roundTripTimeMs}
        onChange={(value) => {
          setConfigValue('roundTripTimeMs', value)
        }}
      />

      <NumberField
        label={BOUNDS.lossProbability.label}
        min={BOUNDS.lossProbability.min}
        max={BOUNDS.lossProbability.max}
        step={BOUNDS.lossProbability.step}
        value={config.lossProbability}
        error={errors.lossProbability}
        format={(value) => `${(value * 100).toFixed(0)}%`}
        onChange={(value) => {
          setConfigValue('lossProbability', value)
        }}
      />

      <NumberField
        label={BOUNDS.totalBytesToTransfer.label}
        min={BOUNDS.totalBytesToTransfer.min}
        max={BOUNDS.totalBytesToTransfer.max}
        step={BOUNDS.totalBytesToTransfer.step}
        value={config.totalBytesToTransfer}
        error={errors.totalBytesToTransfer}
        format={(value) => `${(value / 1000).toFixed(0)} kB`}
        onChange={(value) => {
          setConfigValue('totalBytesToTransfer', value)
        }}
      />

      <NumberField
        label={BOUNDS.maximumSegmentSizeBytes.label}
        unit={BOUNDS.maximumSegmentSizeBytes.unit}
        min={BOUNDS.maximumSegmentSizeBytes.min}
        max={BOUNDS.maximumSegmentSizeBytes.max}
        step={BOUNDS.maximumSegmentSizeBytes.step}
        value={config.maximumSegmentSizeBytes}
        error={errors.maximumSegmentSizeBytes}
        onChange={(value) => {
          setConfigValue('maximumSegmentSizeBytes', value)
        }}
      />

      <SeedField />

      <button
        type="submit"
        disabled={hasErrors || isRunning}
        title={hasErrors ? errors[firstErrorField] : undefined}
        className="rounded bg-raised px-3 py-2 text-ui font-medium text-fg transition-colors duration-150 hover:bg-edge disabled:text-fg-faint disabled:hover:bg-raised"
      >
        {showLoading ? 'Running…' : 'Run simulation'}
      </button>
    </form>
  )
}

/**
 * The seed is a number entry rather than a slider: it is an identity,
 * not a magnitude, and determinism makes it worth typing exactly.
 */
function SeedField() {
  const { config, setConfigValue, errors } = useSimulation()
  const id = useId()
  const errorId = `${id}-error`
  const invalid = errors.seed !== undefined

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-label text-fg-muted">
        {BOUNDS.seed.label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          type="number"
          className={`min-w-0 flex-1 rounded border bg-raised px-2 py-1.5 font-mono text-axis text-fg ${
            invalid ? 'border-danger' : 'border-edge'
          }`}
          min={BOUNDS.seed.min}
          max={BOUNDS.seed.max}
          step={BOUNDS.seed.step}
          value={Number.isFinite(config.seed) ? config.seed : ''}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          onChange={(event) => {
            setConfigValue('seed', event.target.valueAsNumber)
          }}
        />
        <button
          type="button"
          className="rounded border border-edge px-2 py-1 text-label text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg"
          onClick={() => {
            setConfigValue('seed', (config.seed + 1) % (BOUNDS.seed.max + 1))
          }}
        >
          Next
        </button>
      </div>
      {invalid && (
        <p id={errorId} className="text-label text-danger">
          {errors.seed}
        </p>
      )}
    </div>
  )
}
