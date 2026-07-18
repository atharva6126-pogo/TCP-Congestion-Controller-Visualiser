import { StatsPanel } from '../../features/stats/StatsPanel'

/**
 * Right rail — live statistics and the event inspector (§4). Visible at
 * xl and up; smaller viewports reach the same content through the stats
 * drawer (§17).
 */
export function StatsRail() {
  return (
    <aside
      aria-label="Run statistics"
      className="hidden h-full flex-col border-l border-edge bg-surface p-4 xl:flex"
    >
      <StatsPanel />
    </aside>
  )
}
