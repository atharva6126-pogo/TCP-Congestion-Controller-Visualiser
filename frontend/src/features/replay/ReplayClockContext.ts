import { createContext } from 'react'

import type { ReplayClock } from './replayClock'

export const ReplayClockContext = createContext<ReplayClock | null>(null)
