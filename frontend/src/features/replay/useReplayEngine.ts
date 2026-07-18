import { useContext } from 'react'

import { ReplayClockContext } from './ReplayClockContext'
import type { ReplayEngine } from './replayEngine'

export function useReplayEngine(): ReplayEngine {
  const engine = useContext(ReplayClockContext)
  if (engine === null) {
    throw new Error('Replay hooks must be used within a ReplayClockProvider')
  }
  return engine
}
