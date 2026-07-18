import { createContext } from 'react'

import type { Selection } from './selection'

export interface InspectorContextValue {
  selection: Selection
  select: (selection: Selection) => void
  clear: () => void
}

export const InspectorContext = createContext<InspectorContextValue | null>(null)
