import { CwndChart } from '../../features/charts/CwndChart'
import { PacketLane } from '../../features/packets/PacketLane'
import { useSimulation } from '../../features/simulation/useSimulation'
import { Kbd } from '../ui/Kbd'

/**
 * Center stage — the visualization surface (§4): the packet lane above
 * the congestion window chart. With no run yet, the designed first-run
 * empty state (§11). While a run is in flight the previous one stays
 * visible, dimmed (§12).
 */
export function Stage() {
  const { run, showLoading } = useSimulation()

  if (run === null) {
    return <EmptyStage />
  }

  return (
    <main
      aria-label="Visualization stage"
      aria-busy={showLoading}
      className={`flex h-full min-h-0 flex-col transition-opacity duration-150 ${
        showLoading ? 'opacity-85' : ''
      }`}
    >
      <section aria-label="Packet flight lane" className="border-b border-edge px-6 pt-4 pb-2">
        <div className="mx-auto max-w-4xl">
          <PacketLane timeline={run.timeline} />
        </div>
      </section>
      <section aria-label="Congestion window" className="min-h-[240px] flex-1 px-6 pt-3 pb-4">
        <CwndChart timeline={run.timeline} />
      </section>
      {/* Small multiples (throughput, RTT, ack progress) mount below (§14). */}
    </main>
  )
}

function EmptyStage() {
  const { runSimulation, showLoading, firstErrorField } = useSimulation()

  return (
    <main aria-label="Visualization stage" className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <SawtoothSketch />
        <p className="text-section text-fg-muted">Simulate how TCP decides how fast to send.</p>
        <button
          type="button"
          disabled={showLoading || firstErrorField !== null}
          onClick={runSimulation}
          className="rounded bg-raised px-4 py-2 text-ui font-medium text-fg transition-colors duration-150 hover:bg-edge disabled:text-fg-faint"
        >
          {showLoading ? 'Running…' : 'Run simulation'}
        </button>
        <p className="text-label text-fg-faint">
          Press <Kbd>?</Kbd> for keyboard shortcuts
        </p>
      </div>
    </main>
  )
}

/** Faint 1px sawtooth sketch in border color — the §11 empty-state illustration. */
function SawtoothSketch() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 96"
      className="w-72 text-edge"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <polyline points="8,88 24,72 40,44 72,24 104,16 104,80 136,60 168,44 200,32 200,72 232,56 264,44 296,34 312,30" />
      <line x1="8" y1="92" x2="312" y2="92" strokeDasharray="2 4" />
    </svg>
  )
}
