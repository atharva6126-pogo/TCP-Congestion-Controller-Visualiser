import { ALGORITHM_COLOR_VAR, ALGORITHM_LABEL } from '../simulation/algorithmColors'
import type { AlgorithmName } from '../simulation/timeline'

interface ComparisonLegendProps {
  algorithms: readonly AlgorithmName[]
  focused: AlgorithmName
  onFocus: (algorithm: AlgorithmName) => void
}

/**
 * Legend and focus control in one (DESIGN_SPEC §15): choosing an
 * algorithm points the packet lane and the inspectors at it.
 *
 * Identity color is never the only cue — every entry is named, and the
 * focused entry is bold, marked with a bullet, and announced through
 * aria-pressed.
 */
export function ComparisonLegend({ algorithms, focused, onFocus }: ComparisonLegendProps) {
  return (
    <div
      role="group"
      aria-label="Algorithms — choose which one to follow"
      className="flex flex-wrap gap-1"
    >
      {algorithms.map((algorithm) => {
        const isFocused = algorithm === focused
        return (
          <button
            key={algorithm}
            type="button"
            aria-pressed={isFocused}
            onClick={() => {
              onFocus(algorithm)
            }}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-label transition-colors duration-150 hover:bg-raised ${
              isFocused ? 'bg-raised font-medium text-fg' : 'text-fg-muted'
            }`}
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: ALGORITHM_COLOR_VAR[algorithm] }}
            />
            {ALGORITHM_LABEL[algorithm]}
            {isFocused && <span className="sr-only">(followed by the packet lane)</span>}
          </button>
        )
      })}
    </div>
  )
}
