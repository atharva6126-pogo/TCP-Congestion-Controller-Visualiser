import { StatsRailContent } from './StatsRailContent'

/**
 * Right rail — statistics and the inspectors (§4). Visible at xl and
 * up; smaller viewports reach the same content through the stats
 * drawer (§17).
 */
export function StatsRail() {
  return (
    <aside
      aria-label="Run statistics and inspectors"
      className="hidden h-full min-h-0 border-l border-edge bg-surface xl:block"
    >
      <StatsRailContent />
    </aside>
  )
}
