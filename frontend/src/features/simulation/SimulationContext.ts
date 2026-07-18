import { createContext } from 'react'

import type { SimulationRun } from '../../lib/api/simulations'
import type { ConfigErrors, ConfigField, SimulationFormConfig } from './config'

export interface SimulationFailure {
  message: string
  /** Shown with the error so a failing run can be reproduced (§13). */
  seed: number
}

export interface SimulationContextValue {
  config: SimulationFormConfig
  setConfigValue: <Field extends keyof SimulationFormConfig>(
    field: Field,
    value: SimulationFormConfig[Field],
  ) => void
  errors: ConfigErrors
  firstErrorField: ConfigField | null
  isRunning: boolean
  /** True only once a run has been slow enough to warrant an indicator (§12). */
  showLoading: boolean
  /** The last successful run; kept when a later run fails (§13). */
  run: SimulationRun | null
  failure: SimulationFailure | null
  runSimulation: () => void
  dismissFailure: () => void
}

export const SimulationContext = createContext<SimulationContextValue | null>(null)
