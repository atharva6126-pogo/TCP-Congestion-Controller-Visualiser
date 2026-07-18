import { useEffect } from 'react'

import { REPLAY_SPEEDS } from '../features/replay/replayClock'
import type { ReplaySpeed } from '../features/replay/replayClock'

interface GlobalShortcutHandlers {
  toggleHelp: () => void
  toggleConfigRail: () => void
  toggleReplay: () => void
  stepForward: () => void
  stepBackward: () => void
  jumpToNextLoss: () => void
  jumpToPreviousLoss: () => void
  toggleComparison: () => void
  rerun: () => void
  setSpeed: (speed: ReplaySpeed) => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  )
}

/** Digit keys that name a speed the transport bar offers (§6: 1–8). */
function speedForDigit(key: string): ReplaySpeed | null {
  const value = Number(key)
  return REPLAY_SPEEDS.find((speed) => speed === value) ?? null
}

/**
 * Global keyboard shortcuts (DESIGN_SPEC §6). Skips events aimed at
 * editable controls so typing and slider-arrowing never trigger
 * workspace actions; Space is additionally left alone on buttons,
 * where it is activation.
 *
 * Modified keystrokes belong to the browser (⌘R, ⌘1, …) and are left
 * alone — the one deliberate exception is ⌘/Ctrl+\ for the config rail,
 * which is handled before that guard.
 */
export function useGlobalShortcuts(handlers: GlobalShortcutHandlers): void {
  const {
    toggleHelp,
    toggleConfigRail,
    toggleReplay,
    stepForward,
    stepBackward,
    jumpToNextLoss,
    jumpToPreviousLoss,
    toggleComparison,
    rerun,
    setSpeed,
  } = handlers

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return
      }

      if (event.key === '\\' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleConfigRail()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      const speed = speedForDigit(event.key)

      if (event.key === '?') {
        event.preventDefault()
        toggleHelp()
      } else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        toggleReplay()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        if (event.shiftKey) {
          jumpToNextLoss()
        } else {
          stepForward()
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        if (event.shiftKey) {
          jumpToPreviousLoss()
        } else {
          stepBackward()
        }
      } else if (event.key === 'c' || event.key === 'C') {
        event.preventDefault()
        toggleComparison()
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        rerun()
      } else if (speed !== null) {
        event.preventDefault()
        setSpeed(speed)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    toggleHelp,
    toggleConfigRail,
    toggleReplay,
    stepForward,
    stepBackward,
    jumpToNextLoss,
    jumpToPreviousLoss,
    toggleComparison,
    rerun,
    setSpeed,
  ])
}
