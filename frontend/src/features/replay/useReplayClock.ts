import { useContext } from 'react'

import { ReplayClockContext } from './ReplayClockContext'
import type { ReplayClock } from './replayClock'

export function useReplayClock(): ReplayClock {
  const context = useContext(ReplayClockContext)
  if (context === null) {
    throw new Error('useReplayClock must be used within a ReplayClockProvider')
  }
  return context
}
