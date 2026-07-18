import { SectionLabel } from '../ui/SectionLabel'

/**
 * Right rail — live statistics and the event inspector (DESIGN_SPEC §4).
 *
 * Foundation scope: the region and its label. Stat tiles (with their §11
 * em-dash empty state) and the inspector arrive with the stats task.
 */
export function StatsRail() {
  return (
    <aside
      aria-label="Run statistics"
      className="hidden h-full flex-col gap-3 border-l border-edge bg-surface p-4 xl:flex"
    >
      <SectionLabel>Statistics</SectionLabel>
    </aside>
  )
}
