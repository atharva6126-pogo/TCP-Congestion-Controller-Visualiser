import { useContext } from 'react'

import { SimulationContext } from './SimulationContext'
import type { SimulationContextValue } from './SimulationContext'

export function useSimulation(): SimulationContextValue {
  const context = useContext(SimulationContext)
  if (context === null) {
    throw new Error('useSimulation must be used within a SimulationProvider')
  }
  return context
}
