/**
 * Keyboard shortcuts implemented today (DESIGN_SPEC §6). This list feeds
 * both the global handler and the help overlay so the reference can
 * never drift from behavior. Remaining §6 shortcuts (Shift+←/→ loss
 * jumps, 1–8 speed, C comparison, R re-run) arrive with their features.
 */

export interface ShortcutDefinition {
  keys: readonly string[]
  description: string
}

export const SHORTCUTS: readonly ShortcutDefinition[] = [
  { keys: ['Space'], description: 'Play or pause the replay (once a run is loaded)' },
  { keys: ['←', '→'], description: 'Step to the previous or next event' },
  { keys: ['⌘/Ctrl', '\\'], description: 'Collapse or expand the configuration rail' },
  { keys: ['?'], description: 'Show this shortcut reference' },
  { keys: ['Esc'], description: 'Close dialogs' },
]
