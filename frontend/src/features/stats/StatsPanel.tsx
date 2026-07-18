import { SectionLabel } from '../../components/ui/SectionLabel'
import { StatTile } from './StatTile'

/**
 * The six run metrics (backend StatisticsCollector vocabulary). With no
 * run loaded every tile shows the §11 em-dash empty state — structure is
 * visible before data exists. Live values arrive with the stats task.
 */
export function StatsPanel() {
  return (
    <section aria-label="Run statistics" className="flex flex-col gap-3">
      <SectionLabel>Statistics</SectionLabel>
      <dl className="flex flex-col gap-2">
        <StatTile label="Throughput" value={null} unit="B/s" />
        <StatTile label="Delivery ratio" value={null} />
        <StatTile label="Retransmissions" value={null} />
        <StatTile label="Mean RTT" value={null} unit="ms" />
        <StatTile label="Packets lost" value={null} />
        <StatTile label="Window" value={null} unit="seg" />
      </dl>
    </section>
  )
}
