/**
 * Keyboard shortcuts (DESIGN_SPEC §6). This list feeds both the global
 * handler and the help overlay so the reference can never drift from
 * behavior.
 */

export interface ShortcutDefinition {
  keys: readonly string[]
  description: string
}

export const SHORTCUTS: readonly ShortcutDefinition[] = [
  { keys: ['Space'], description: 'Play or pause the replay (once a run is loaded)' },
  { keys: ['←', '→'], description: 'Step to the previous or next event' },
  { keys: ['Shift', '←/→'], description: 'Jump to the previous or next loss' },
  { keys: ['↑', '↓'], description: 'Move between events in the timeline list' },
  { keys: ['Enter'], description: 'Inspect the selected event’s packet' },
  { keys: ['1', '2', '4', '8'], description: 'Set the replay speed' },
  { keys: ['C'], description: 'Switch between single and comparison mode' },
  { keys: ['R'], description: 'Re-run the current configuration' },
  { keys: ['⌘/Ctrl', '\\'], description: 'Collapse or expand the configuration rail' },
  { keys: ['?'], description: 'Show this shortcut reference' },
  { keys: ['Esc'], description: 'Close dialogs, or clear the inspector selection' },
]
