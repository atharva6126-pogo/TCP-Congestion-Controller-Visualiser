import type { ReactNode } from 'react'

/** All-caps rail section label — DESIGN_SPEC §8. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-label font-medium tracking-[0.06em] text-fg-faint uppercase">{children}</h2>
  )
}
