import { ConfigRail } from './ConfigRail'
import { Stage } from './Stage'
import { StatsRail } from './StatsRail'
import { TransportBar } from './TransportBar'

/**
 * Three-rail workspace grid with a persistent transport bar
 * (DESIGN_SPEC §4, responsive behavior §17):
 *
 * - ≥1280px (xl): config rail · stage · stats rail
 * - 1024–1279px (lg): config rail · stage (stats rail hidden; its tabbed
 *   fallback arrives with the stats task)
 * - <1024px: stage only (rails become drawers in a later task)
 */
export function AppShell() {
  return (
    <div className="grid h-dvh grid-rows-[minmax(0,1fr)_auto]">
      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <div className="hidden lg:block">
          <ConfigRail />
        </div>
        <Stage />
        <StatsRail />
      </div>
      <TransportBar />
    </div>
  )
}
