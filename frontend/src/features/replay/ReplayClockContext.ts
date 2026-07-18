import { createContext } from 'react'

import type { ReplayEngine } from './replayEngine'

export const ReplayClockContext = createContext<ReplayEngine | null>(null)
