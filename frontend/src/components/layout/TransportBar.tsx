import { useReplayClock } from '../../features/replay/useReplayClock'

/**
 * Bottom transport bar — replay controls (DESIGN_SPEC §4).
 *
 * Foundation scope: the bar is wired to the ReplayClock contract and
 * shows the cursor readout; controls stay disabled until a run is
 * loaded and the replay driver exists.
 */
export function TransportBar() {
  const { currentTime, duration } = useReplayClock()
  const hasRun = duration > 0

  return (
    <footer
      aria-label="Replay transport"
      className="flex h-14 items-center gap-4 border-t border-edge bg-surface px-4"
    >
      <button
        type="button"
        disabled={!hasRun}
        aria-label="Play"
        className="grid size-8 place-items-center rounded text-fg-muted disabled:text-fg-faint"
      >
        <PlayGlyph />
      </button>

      <div
        aria-hidden="true"
        className="h-1 flex-1 rounded-full bg-raised"
        title={hasRun ? undefined : 'Run a simulation to enable replay'}
      />

      <span className="font-mono text-axis text-fg-muted">t = {currentTime.toFixed(3)} s</span>
    </footer>
  )
}

function PlayGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <path d="M5 3.5v9l7-4.5z" />
    </svg>
  )
}
