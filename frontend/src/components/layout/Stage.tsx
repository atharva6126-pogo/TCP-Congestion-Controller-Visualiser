import { Kbd } from '../ui/Kbd'

/**
 * Center stage — the visualization surface (§4). Foundation scope:
 * renders the designed first-run empty state (§11). The packet lane,
 * cwnd chart, and small multiples mount here in later tasks.
 */
export function Stage() {
  return (
    <main aria-label="Visualization stage" className="flex h-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <SawtoothSketch />
        <p className="text-section text-fg-muted">Simulate how TCP decides how fast to send.</p>
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
