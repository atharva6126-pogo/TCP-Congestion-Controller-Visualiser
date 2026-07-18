import { REPLAY_SPEEDS } from '../../features/replay/replayClock'
import { useReplayClock } from '../../features/replay/useReplayClock'
import { IconButton } from '../ui/IconButton'
import { ColumnsGlyph, PauseGlyph, PlayGlyph, QuestionGlyph, SlidersGlyph } from './glyphs'

interface TransportBarProps {
  onOpenConfigDrawer: () => void
  onOpenStatsDrawer: () => void
  onOpenHelp: () => void
}

const NO_RUN_HINT = 'Run a simulation to enable replay'

/**
 * Bottom transport bar (§4): play/pause · speed · scrubber · time
 * readout. Fully wired to the ReplayClock contract; controls stay
 * disabled until a run loads (the rAF driver arrives with the replay
 * task). Also hosts the drawer toggles on small viewports and the help
 * control.
 */
export function TransportBar({
  onOpenConfigDrawer,
  onOpenStatsDrawer,
  onOpenHelp,
}: TransportBarProps) {
  const { currentTime, duration, isPlaying, speed, play, pause, seek, setSpeed } = useReplayClock()
  const hasRun = duration > 0

  return (
    <footer
      aria-label="Replay transport"
      className="flex h-14 items-center gap-3 border-t border-edge bg-surface px-4"
    >
      <div className="flex gap-1 lg:hidden">
        <IconButton label="Open configuration" onClick={onOpenConfigDrawer}>
          <SlidersGlyph />
        </IconButton>
      </div>
      <div className="flex gap-1 xl:hidden">
        <IconButton label="Open statistics" onClick={onOpenStatsDrawer}>
          <ColumnsGlyph />
        </IconButton>
      </div>

      <IconButton
        label={isPlaying ? 'Pause' : 'Play'}
        onClick={isPlaying ? pause : play}
        disabled={!hasRun}
        disabledHint={NO_RUN_HINT}
      >
        {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
      </IconButton>

      <div
        role="group"
        aria-label="Replay speed"
        className="flex overflow-hidden rounded border border-edge"
      >
        {REPLAY_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={speed === value}
            disabled={!hasRun}
            title={hasRun ? undefined : NO_RUN_HINT}
            onClick={() => {
              setSpeed(value)
            }}
            className={`px-2 py-1 font-mono text-axis transition-colors duration-150 disabled:text-fg-faint ${
              speed === value ? 'bg-raised text-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {value}×
          </button>
        ))}
      </div>

      <input
        type="range"
        aria-label="Timeline position"
        className="transport-scrubber min-w-0 flex-1"
        min={0}
        max={hasRun ? duration : 1}
        step={duration / 1000 || 0.001}
        value={currentTime}
        disabled={!hasRun}
        title={hasRun ? undefined : NO_RUN_HINT}
        onChange={(event) => {
          seek(Number(event.target.value))
        }}
      />

      <span className="font-mono text-axis text-fg-muted">t = {currentTime.toFixed(3)} s</span>

      <IconButton label="Keyboard shortcuts" onClick={onOpenHelp}>
        <QuestionGlyph />
      </IconButton>
    </footer>
  )
}
