import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useSimulation } from '../simulation/useSimulation'
import { InspectorContext } from './InspectorContext'
import type { Selection } from './selection'

/**
 * Holds what the inspector is showing. Selection is UI state, not
 * time: the replay clock remains the only source of simulation time,
 * and every value the inspectors display is derived from it.
 *
 * It lives in a provider because the packet lane (in the stage) and
 * the inspector panel (in the stats rail) are far apart in the tree
 * and must agree on one selection.
 */
export function InspectorProvider({ children }: { children: ReactNode }) {
  const { run } = useSimulation()
  const [selection, setSelection] = useState<Selection>(null)

  const select = useCallback((next: Selection) => {
    setSelection(next)
  }, [])

  const clear = useCallback(() => {
    setSelection(null)
  }, [])

  // A selection refers to one run's timeline; a new run invalidates it.
  useEffect(() => {
    setSelection(null)
  }, [run])

  const value = useMemo(() => ({ selection, select, clear }), [selection, select, clear])

  return <InspectorContext value={value}>{children}</InspectorContext>
}
