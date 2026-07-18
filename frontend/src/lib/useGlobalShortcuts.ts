import { useEffect } from 'react'

interface GlobalShortcutHandlers {
  toggleHelp: () => void
  toggleConfigRail: () => void
  toggleReplay: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, select, [contenteditable="true"]') !== null
  )
}

/**
 * Global keyboard shortcuts (DESIGN_SPEC §6). Skips events aimed at
 * editable controls so typing never triggers workspace actions; Space is
 * additionally left alone on buttons, where it is activation.
 */
export function useGlobalShortcuts(handlers: GlobalShortcutHandlers): void {
  const { toggleHelp, toggleConfigRail, toggleReplay } = handlers

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return
      }
      if (event.key === '?') {
        event.preventDefault()
        toggleHelp()
      } else if (event.key === '\\' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleConfigRail()
      } else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        toggleReplay()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [toggleHelp, toggleConfigRail, toggleReplay])
}
