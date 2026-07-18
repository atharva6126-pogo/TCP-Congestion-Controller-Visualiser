import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { ApiError } from '../../lib/api/client'
import { postSimulation } from '../../lib/api/simulations'
import type { SimulationRun } from '../../lib/api/simulations'
import { useReplayControls } from '../replay/useReplayControls'
import { DEFAULT_CONFIG, toSimulationRequest, validateConfig } from './config'
import type { ConfigField, SimulationFormConfig } from './config'
import { SimulationContext } from './SimulationContext'
import type { SimulationFailure } from './SimulationContext'
import { uniqueEventTimestamps } from './timeline'

/** Runs faster than this show no indicator at all (DESIGN_SPEC §12). */
const LOADING_INDICATOR_DELAY_MS = 300

/**
 * Owns the configuration draft and the simulation request lifecycle,
 * and hands each successful timeline to the replay clock.
 *
 * Configuration lives here rather than in the rail because the rail is
 * rendered twice (desktop aside and small-viewport drawer) and both
 * must edit the same draft.
 */
export function SimulationProvider({ children }: { children: ReactNode }) {
  const { loadTimeline, play } = useReplayControls()
  const [config, setConfig] = useState<SimulationFormConfig>(DEFAULT_CONFIG)
  const [isRunning, setIsRunning] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [run, setRun] = useState<SimulationRun | null>(null)
  const [failure, setFailure] = useState<SimulationFailure | null>(null)
  const requestIdRef = useRef(0)

  const errors = useMemo(() => validateConfig(config), [config])
  const firstErrorField = (Object.keys(errors)[0] ?? null) as ConfigField | null

  const setConfigValue = useCallback(
    <Field extends keyof SimulationFormConfig>(
      field: Field,
      value: SimulationFormConfig[Field],
    ) => {
      setConfig((current) => ({ ...current, [field]: value }))
    },
    [],
  )

  const runSimulation = useCallback(() => {
    if (Object.keys(validateConfig(config)).length > 0) {
      return
    }
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const seed = config.seed

    setIsRunning(true)
    setFailure(null)

    void postSimulation(toSimulationRequest(config))
      .then((result) => {
        // A superseded request must not overwrite a newer one.
        if (requestIdRef.current !== requestId) {
          return
        }
        setRun(result)
        // Replay starts as soon as a run is available (§2).
        loadTimeline(result.timeline.durationSeconds, uniqueEventTimestamps(result.timeline.events))
        play()
      })
      .catch((error: unknown) => {
        if (requestIdRef.current !== requestId) {
          return
        }
        // The previous run stays on screen; only the banner changes (§13).
        setFailure({
          message:
            error instanceof ApiError
              ? error.message
              : 'The simulation could not be completed. Please try again.',
          seed,
        })
      })
      .finally(() => {
        if (requestIdRef.current === requestId) {
          setIsRunning(false)
        }
      })
  }, [config, loadTimeline, play])

  useEffect(() => {
    if (!isRunning) {
      setShowLoading(false)
      return
    }
    // A UI affordance only; simulation time comes solely from the
    // replay clock.
    const timer = window.setTimeout(() => {
      setShowLoading(true)
    }, LOADING_INDICATOR_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [isRunning])

  const dismissFailure = useCallback(() => {
    setFailure(null)
  }, [])

  const value = useMemo(
    () => ({
      config,
      setConfigValue,
      errors,
      firstErrorField,
      isRunning,
      showLoading,
      run,
      failure,
      runSimulation,
      dismissFailure,
    }),
    [
      config,
      setConfigValue,
      errors,
      firstErrorField,
      isRunning,
      showLoading,
      run,
      failure,
      runSimulation,
      dismissFailure,
    ],
  )

  return <SimulationContext value={value}>{children}</SimulationContext>
}
