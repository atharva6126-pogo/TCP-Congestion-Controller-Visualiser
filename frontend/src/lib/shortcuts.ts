/**
 * Keyboard shortcuts implemented today (DESIGN_SPEC §6). This list feeds
 * both the global handler and the help overlay so the reference can
 * never drift from behavior. Replay stepping shortcuts (←/→, 1–8, …)
 * are added with the replay task.
 */

export interface ShortcutDefinition {
  keys: readonly string[]
  description: string
}

export const SHORTCUTS: readonly ShortcutDefinition[] = [
  { keys: ['Space'], description: 'Play or pause the replay (once a run is loaded)' },
  { keys: ['⌘/Ctrl', '\\'], description: 'Collapse or expand the configuration rail' },
  { keys: ['?'], description: 'Show this shortcut reference' },
  { keys: ['Esc'], description: 'Close dialogs' },
]
