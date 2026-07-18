import { createContext } from 'react'

import type { SimulationRun } from '../../lib/api/simulations'
import type { ConfigErrors, ConfigField, SimulationFormConfig } from './config'
import type { AlgorithmName } from './timeline'

export interface SimulationFailure {
  message: string
  /** Shown with the error so a failing run can be reproduced (§13). */
  seed: number
}

/** Single run, or several algorithms under identical conditions (§15). */
export type ViewMode = 'single' | 'comparison'

/** How comparison runs are drawn: overlaid, or one cell each (§15). */
export type ComparisonView = 'overlay' | 'small_multiples'

export interface SimulationContextValue {
  config: SimulationFormConfig
  setConfigValue: <Field extends keyof SimulationFormConfig>(
    field: Field,
    value: SimulationFormConfig[Field],
  ) => void
  errors: ConfigErrors
  firstErrorField: ConfigField | null

  mode: ViewMode
  setMode: (mode: ViewMode) => void
  comparisonAlgorithms: readonly AlgorithmName[]
  toggleComparisonAlgorithm: (algorithm: AlgorithmName) => void
  comparisonView: ComparisonView
  setComparisonView: (view: ComparisonView) => void

  /** Which algorithm the lane and inspectors follow (§15). */
  focusedAlgorithm: AlgorithmName
  setFocusedAlgorithm: (algorithm: AlgorithmName) => void
  /** Baseline for delta statistics; null shows absolute values. */
  deltaBaseline: AlgorithmName | null
  setDeltaBaseline: (algorithm: AlgorithmName | null) => void

  /** Results of the last completed run set, keyed by algorithm. */
  runs: ReadonlyMap<AlgorithmName, SimulationRun>
  /** The run the lane, chart, and inspectors currently follow. */
  activeRun: SimulationRun | null

  isRunning: boolean
  /** True only once a run has been slow enough to warrant an indicator (§12). */
  showLoading: boolean
  failure: SimulationFailure | null
  runSimulation: () => void
  dismissFailure: () => void
}

export const SimulationContext = createContext<SimulationContextValue | null>(null)
