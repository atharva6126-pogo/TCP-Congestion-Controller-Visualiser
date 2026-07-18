import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { ReplayClockContext } from './ReplayClockContext'
import type { ReplayClock, ReplaySpeed } from './replayClock'

function clampTime(timeSeconds: number, duration: number): number {
  return Math.min(Math.max(timeSeconds, 0), duration)
}

/**
 * Holds cursor state and exposes the full ReplayClock contract.
 *
 * Foundation placeholder: state and actions are complete, but nothing
 * advances the cursor while `isPlaying` — the requestAnimationFrame
 * driver that ticks simulation time arrives with the replay task.
 * Consumers written against this contract will not change when it does.
 */
export function ReplayClockProvider({ children }: { children: ReactNode }) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeedState] = useState<ReplaySpeed>(1)

  const play = useCallback(() => {
    setIsPlaying(true)
  }, [])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const seek = useCallback(
    (timeSeconds: number) => {
      setCurrentTime(clampTime(timeSeconds, duration))
    },
    [duration],
  )

  const setSpeed = useCallback((next: ReplaySpeed) => {
    setSpeedState(next)
  }, [])

  const loadTimeline = useCallback((durationSeconds: number) => {
    setDuration(Math.max(durationSeconds, 0))
    setCurrentTime(0)
    setIsPlaying(false)
  }, [])

  const clock = useMemo<ReplayClock>(
    () => ({ currentTime, duration, isPlaying, speed, play, pause, seek, setSpeed, loadTimeline }),
    [currentTime, duration, isPlaying, speed, play, pause, seek, setSpeed, loadTimeline],
  )

  return <ReplayClockContext value={clock}>{children}</ReplayClockContext>
}
