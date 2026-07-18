import type { ReactNode } from 'react'

import { ReplayClockProvider } from '../features/replay/ReplayClockProvider'
import { SimulationProvider } from '../features/simulation/SimulationProvider'
import { ThemeProvider } from '../features/theme/ThemeProvider'

/**
 * Global provider composition. The replay clock wraps the simulation
 * provider, which hands it each new timeline.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ReplayClockProvider>
        <SimulationProvider>{children}</SimulationProvider>
      </ReplayClockProvider>
    </ThemeProvider>
  )
}
