import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { ApiError } from '../../lib/api/client'
import { postSimulation } from '../../lib/api/simulations'
import type { SimulationRequest, SimulationRun } from '../../lib/api/simulations'
import { mergeTimelines } from '../comparison/comparisonSeries'
import { useReplayControls } from '../replay/useReplayControls'
import { toSimulationRequest, validateConfig } from './config'
import type { ConfigField, SimulationFormConfig } from './config'
import { SimulationContext } from './SimulationContext'
import type { ComparisonView, SimulationFailure, ViewMode } from './SimulationContext'
import type { AlgorithmName } from './timeline'
import { ALGORITHM_ORDER } from './algorithmColors'
import { buildShareSearch, hasSharedState, parseSharedState } from './urlState'

/** Runs faster than this show no indicator at all (DESIGN_SPEC §12). */
const LOADING_INDICATOR_DELAY_MS = 300

function conditionsKey(request: SimulationRequest): string {
  const { algorithm: _algorithm, ...conditions } = request
  return JSON.stringify(conditions)
}

/**
 * Owns the configuration draft and the simulation request lifecycle,
 * and hands the resulting timelines to the replay clock.
 *
 * Comparison runs one request per algorithm built from the *same*
 * configuration object, so identical conditions and a shared seed hold
 * by construction and no simulation logic is duplicated — it is the
 * same endpoint as a single run. Completed runs are cached by request,
 * so switching focus, changing view, or leaving and re-entering
 * comparison never re-runs work already done.
 *
 * The workspace state is mirrored into the URL (§6). A link therefore
 * always describes what is on screen, and opening one restores that
 * configuration and runs it.
 */
export function SimulationProvider({ children }: { children: ReactNode }) {
  const { loadTimeline, play } = useReplayControls()
  // Read once: the URL seeds the workspace, and from then on the
  // workspace writes the URL.
  const [initialState] = useState(() => parseSharedState(window.location.search))
  const [openedFromLink] = useState(() => hasSharedState(window.location.search))
  const [config, setConfig] = useState<SimulationFormConfig>(initialState.config)
  const [mode, setMode] = useState<ViewMode>(initialState.mode)
  const [comparisonAlgorithms, setComparisonAlgorithms] = useState<readonly AlgorithmName[]>(
    initialState.comparisonAlgorithms,
  )
  const [comparisonView, setComparisonView] = useState<ComparisonView>(initialState.comparisonView)
  const [focusedAlgorithm, setFocusedAlgorithm] = useState<AlgorithmName>(
    initialState.config.algorithm,
  )
  const [deltaBaseline, setDeltaBaseline] = useState<AlgorithmName | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [showLoading, setShowLoading] = useState(false)
  const [runs, setRuns] = useState<ReadonlyMap<AlgorithmName, SimulationRun>>(new Map())
  const [failure, setFailure] = useState<SimulationFailure | null>(null)

  const requestIdRef = useRef(0)
  const cacheRef = useRef(new Map<string, SimulationRun>())
  const conditionsKeyRef = useRef<string | null>(null)

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

  const toggleComparisonAlgorithm = useCallback((algorithm: AlgorithmName) => {
    setComparisonAlgorithms((current) =>
      current.includes(algorithm)
        ? current.filter((entry) => entry !== algorithm)
        : ALGORITHM_ORDER.filter((entry) => entry === algorithm || current.includes(entry)),
    )
  }, [])

  const runSimulation = useCallback(() => {
    if (Object.keys(validateConfig(config)).length > 0) {
      return
    }
    const targets = mode === 'single' ? [config.algorithm] : comparisonAlgorithms
    if (targets.length === 0) {
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const seed = config.seed
    const baseRequest = toSimulationRequest(config)

    // Cached runs are only valid for the conditions that produced them.
    const key = conditionsKey(baseRequest)
    if (conditionsKeyRef.current !== key) {
      cacheRef.current.clear()
      conditionsKeyRef.current = key
    }

    setIsRunning(true)
    setFailure(null)

    const fetchOne = async (algorithm: AlgorithmName): Promise<[AlgorithmName, SimulationRun]> => {
      const cached = cacheRef.current.get(algorithm)
      if (cached !== undefined) {
        return [algorithm, cached]
      }
      const result = await postSimulation({ ...baseRequest, algorithm })
      cacheRef.current.set(algorithm, result)
      return [algorithm, result]
    }

    void Promise.all(targets.map(fetchOne))
      .then((entries) => {
        // A superseded request must not overwrite a newer one.
        if (requestIdRef.current !== requestId) {
          return
        }
        const nextRuns = new Map(entries)
        setRuns(nextRuns)
        setFocusedAlgorithm((current) =>
          nextRuns.has(current) ? current : (targets[0] ?? current),
        )
        // The clock spans every run so the scrubber covers them all.
        const merged = mergeTimelines(nextRuns)
        loadTimeline(merged.durationSeconds, merged.eventTimestamps)
        play()
      })
      .catch((error: unknown) => {
        if (requestIdRef.current !== requestId) {
          return
        }
        // The previous runs stay on screen; only the banner changes (§13).
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
  }, [config, mode, comparisonAlgorithms, loadTimeline, play])

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

  // The URL tracks the workspace continuously, so the address bar (and
  // anything copied from it) always matches what is on screen. History
  // is replaced rather than pushed: editing a field is not navigation.
  useEffect(() => {
    const search = buildShareSearch({ config, mode, comparisonAlgorithms, comparisonView })
    if (search !== window.location.search) {
      window.history.replaceState(null, '', `${window.location.pathname}${search}`)
    }
  }, [config, mode, comparisonAlgorithms, comparisonView])

  // A shared link is an invitation to see the run, not to retype it, so
  // a URL that carries state runs itself once on arrival. Whether the
  // link carried state is captured during the first render, before the
  // effect above writes the URL — otherwise every visit would look like
  // a shared one and the first-run empty state (§11) would never show.
  const autoRanRef = useRef(false)
  useEffect(() => {
    if (autoRanRef.current || !openedFromLink) {
      return
    }
    autoRanRef.current = true
    runSimulation()
  }, [openedFromLink, runSimulation])

  const dismissFailure = useCallback(() => {
    setFailure(null)
  }, [])

  const activeRun =
    (mode === 'single' ? runs.get(config.algorithm) : runs.get(focusedAlgorithm)) ?? null

  const value = useMemo(
    () => ({
      config,
      setConfigValue,
      errors,
      firstErrorField,
      mode,
      setMode,
      comparisonAlgorithms,
      toggleComparisonAlgorithm,
      comparisonView,
      setComparisonView,
      focusedAlgorithm,
      setFocusedAlgorithm,
      deltaBaseline,
      setDeltaBaseline,
      runs,
      activeRun,
      isRunning,
      showLoading,
      failure,
      runSimulation,
      dismissFailure,
    }),
    [
      config,
      setConfigValue,
      errors,
      firstErrorField,
      mode,
      comparisonAlgorithms,
      toggleComparisonAlgorithm,
      comparisonView,
      focusedAlgorithm,
      deltaBaseline,
      runs,
      activeRun,
      isRunning,
      showLoading,
      failure,
      runSimulation,
      dismissFailure,
    ],
  )

  return <SimulationContext value={value}>{children}</SimulationContext>
}
