import { InspectorDetails } from '../../features/inspector/InspectorDetails'
import { TimelineInspector } from '../../features/inspector/TimelineInspector'
import { useSimulation } from '../../features/simulation/useSimulation'
import { StatsPanel } from '../../features/stats/StatsPanel'

/**
 * Inner content of the statistics rail, shared between the desktop
 * aside and the small-viewport drawer (§17): run totals, the details
 * of whatever is selected, and the replay log.
 */
export function StatsRailContent() {
  const { run } = useSimulation()

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <StatsPanel />
      {run !== null && (
        <>
          <InspectorDetails timeline={run.timeline} />
          <TimelineInspector timeline={run.timeline} />
        </>
      )}
    </div>
  )
}
