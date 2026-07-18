import { SectionLabel } from '../../components/ui/SectionLabel'
import { useSimulation } from '../simulation/useSimulation'
import { StatTile } from './StatTile'

/**
 * Run totals for the current simulation (backend StatisticsCollector
 * vocabulary). With no run loaded every tile shows the §11 em-dash
 * empty state — structure is visible before data exists.
 *
 * These are whole-run figures; the cursor-relative values described in
 * §2 arrive with the statistics task.
 */
export function StatsPanel() {
  const { activeRun } = useSimulation()
  const statistics = activeRun?.statistics ?? null

  return (
    <section aria-label="Run statistics" className="flex flex-col gap-3">
      <SectionLabel>Statistics</SectionLabel>
      <dl className="flex flex-col gap-2">
        <StatTile
          label="Throughput"
          unit="kB/s"
          value={
            statistics === null ? null : (statistics.throughputBytesPerSecond / 1000).toFixed(1)
          }
        />
        <StatTile
          label="Delivery ratio"
          value={
            statistics === null ? null : `${(statistics.packetDeliveryRatio * 100).toFixed(1)}%`
          }
        />
        <StatTile
          label="Retransmissions"
          value={statistics === null ? null : String(statistics.retransmissionCount)}
        />
        <StatTile
          label="Mean RTT"
          unit="ms"
          value={statistics === null ? null : (statistics.averageRttSeconds * 1000).toFixed(1)}
        />
        <StatTile
          label="Packets lost"
          value={statistics === null ? null : String(statistics.packetLossCount)}
        />
      </dl>
    </section>
  )
}
