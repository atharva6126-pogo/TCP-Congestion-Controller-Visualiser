import type { ReactNode } from 'react'

/** A keyboard key chip, used in the shortcut reference and hints. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-edge bg-raised px-1.5 py-0.5 font-mono text-label text-fg-muted">
      {children}
    </kbd>
  )
}
