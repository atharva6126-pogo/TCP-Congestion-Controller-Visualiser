import type { ReactNode } from 'react'

import { ReplayClockProvider } from '../features/replay/ReplayClockProvider'
import { ThemeProvider } from '../features/theme/ThemeProvider'

/**
 * Global provider composition. Future providers (simulation runs,
 * comparison set) nest here so the tree stays declared in one place.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ReplayClockProvider>{children}</ReplayClockProvider>
    </ThemeProvider>
  )
}
