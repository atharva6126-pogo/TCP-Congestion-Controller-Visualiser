import type { ReactNode } from 'react'

import { InspectorProvider } from '../features/inspector/InspectorProvider'
import { ReplayClockProvider } from '../features/replay/ReplayClockProvider'
import { SimulationProvider } from '../features/simulation/SimulationProvider'
import { ThemeProvider } from '../features/theme/ThemeProvider'

/**
 * Global provider composition. The replay clock wraps the simulation
 * provider, which hands it each new timeline; the inspector holds the
 * selection the lane and the stats rail share.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ReplayClockProvider>
        <SimulationProvider>
          <InspectorProvider>{children}</InspectorProvider>
        </SimulationProvider>
      </ReplayClockProvider>
    </ThemeProvider>
  )
}
