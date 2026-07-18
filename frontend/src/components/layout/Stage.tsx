import { useEffect } from 'react'

import { PacketLane } from '../../features/packets/PacketLane'
import { useReplayControls } from '../../features/replay/useReplayControls'
// TEMPORARY: demo fixture until backend integration; see fixtures/demoTimeline.ts.
import { DEMO_TIMELINE } from '../../features/simulation/fixtures/demoTimeline'
import { uniqueEventTimestamps } from '../../features/simulation/timeline'
import type { SimulationTimeline } from '../../features/simulation/timeline'
import { Kbd } from '../ui/Kbd'

/**
 * Center stage — the visualization surface (§4): the packet lane on
 * top; the cwnd chart and small multiples mount below in later tasks.
 * With no timeline, renders the designed first-run empty state (§11).
 */
export function Stage() {
  const { loadTimeline, play } = useReplayControls()
  const timeline: SimulationTimeline | null = DEMO_TIMELINE

  useEffect(() => {
    if (timeline === null) {
      return
    }
    // Replay begins automatically once a run is available (§2).
    loadTimeline(timeline.durationSeconds, uniqueEventTimestamps(timeline.events))
    play()
  }, [timeline, loadTimeline, play])

  if (timeline === null) {
    return <EmptyStage />
  }

  return (
    <main aria-label="Visualization stage" className="flex h-full min-h-0 flex-col">
      <section aria-label="Packet flight lane" className="border-b border-edge px-6 pt-4 pb-2">
        <div className="mx-auto max-w-4xl">
          <PacketLane timeline={timeline} />
        </div>
      </section>
      {/* The cwnd chart and small multiples (§14) mount here. */}
      <div className="min-h-0 flex-1" />
    </main>
  )
}

function EmptyStage() {
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
