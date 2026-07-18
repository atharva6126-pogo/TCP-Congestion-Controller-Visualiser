import { useContext } from 'react'

import { InspectorContext } from './InspectorContext'
import type { InspectorContextValue } from './InspectorContext'

export function useInspector(): InspectorContextValue {
  const context = useContext(InspectorContext)
  if (context === null) {
    throw new Error('useInspector must be used within an InspectorProvider')
  }
  return context
}
