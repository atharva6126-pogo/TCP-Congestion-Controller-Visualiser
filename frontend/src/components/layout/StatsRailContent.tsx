import { ComparisonTable } from '../../features/comparison/ComparisonTable'
import { InspectorDetails } from '../../features/inspector/InspectorDetails'
import { TimelineInspector } from '../../features/inspector/TimelineInspector'
import { useSimulation } from '../../features/simulation/useSimulation'
import { StatsPanel } from '../../features/stats/StatsPanel'

/**
 * Inner content of the statistics rail, shared between the desktop
 * aside and the small-viewport drawer (§17).
 *
 * Comparing several algorithms replaces the single-run totals with the
 * comparison table (§15); the inspectors always describe the focused
 * run.
 */
export function StatsRailContent() {
  const { activeRun, runs, mode } = useSimulation()
  const comparing = mode === 'comparison' && runs.size > 1

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      {comparing ? <ComparisonTable runs={runs} /> : <StatsPanel />}
      {activeRun !== null && (
        <>
          <InspectorDetails timeline={activeRun.timeline} />
          <TimelineInspector timeline={activeRun.timeline} />
        </>
      )}
    </div>
  )
}
