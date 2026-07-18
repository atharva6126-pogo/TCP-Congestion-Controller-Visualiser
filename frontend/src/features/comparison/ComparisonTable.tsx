import { useMemo } from 'react'

import { SectionLabel } from '../../components/ui/SectionLabel'
import { ALGORITHM_COLOR_VAR, ALGORITHM_LABEL } from '../simulation/algorithmColors'
import { useSimulation } from '../simulation/useSimulation'
import type { AlgorithmName } from '../simulation/timeline'
import { buildAlgorithmSeries, buildMetricRows, deltaAgainst } from './comparisonSeries'
import type { MetricRow, RunMap } from './comparisonSeries'

interface ComparisonTableProps {
  runs: RunMap
}

/**
 * Metrics as rows, algorithms as columns (DESIGN_SPEC §15).
 *
 * The best value in each row is marked by weight and by text for
 * screen readers, never by color alone. Choosing a baseline re-renders
 * the values as signed differences against it.
 */
export function ComparisonTable({ runs }: ComparisonTableProps) {
  const { deltaBaseline, setDeltaBaseline } = useSimulation()
  const list = useMemo(() => buildAlgorithmSeries(runs), [runs])
  const rows = useMemo(() => buildMetricRows(runs, list), [runs, list])
  const algorithms = list.map((entry) => entry.algorithm)

  if (algorithms.length === 0) {
    return null
  }

  return (
    <section aria-label="Algorithm comparison" className="flex flex-col gap-2">
      <SectionLabel>Comparison</SectionLabel>

      <label className="flex items-center gap-2 text-label text-fg-muted">
        Compare against
        <select
          value={deltaBaseline ?? ''}
          onChange={(event) => {
            setDeltaBaseline(
              event.target.value === '' ? null : (event.target.value as AlgorithmName),
            )
          }}
          className="min-w-0 flex-1 rounded border border-edge bg-raised px-1.5 py-1 text-label text-fg"
        >
          <option value="">Absolute values</option>
          {algorithms.map((algorithm) => (
            <option key={algorithm} value={algorithm}>
              Δ vs {ALGORITHM_LABEL[algorithm]}
            </option>
          ))}
        </select>
      </label>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-label">
          <caption className="sr-only">
            {deltaBaseline === null
              ? 'Performance metrics for each algorithm under identical conditions.'
              : `Performance metrics as differences against ${ALGORITHM_LABEL[deltaBaseline]}, under identical conditions.`}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="py-1 text-left font-medium text-fg-faint">
                Metric
              </th>
              {algorithms.map((algorithm) => (
                <th
                  key={algorithm}
                  scope="col"
                  className="py-1 text-right font-medium"
                  style={{ color: ALGORITHM_COLOR_VAR[algorithm] }}
                >
                  <abbr title={ALGORITHM_LABEL[algorithm]} className="no-underline">
                    {SHORT_LABEL[algorithm]}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <MetricTableRow
                key={row.key}
                row={row}
                algorithms={algorithms}
                baseline={deltaBaseline}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const SHORT_LABEL: Record<AlgorithmName, string> = {
  tahoe: 'Tahoe',
  reno: 'Reno',
  new_reno: 'NewReno',
  cubic: 'Cubic',
}

function MetricTableRow({
  row,
  algorithms,
  baseline,
}: {
  row: MetricRow
  algorithms: readonly AlgorithmName[]
  baseline: AlgorithmName | null
}) {
  return (
    <tr className="border-t border-edge">
      <th scope="row" className="py-1 pr-2 text-left font-normal text-fg-muted">
        {row.label}
        <span className="sr-only">
          {row.better === 'higher' ? ' (higher is better)' : ' (lower is better)'}
        </span>
      </th>
      {algorithms.map((algorithm) => {
        const value = row.values.get(algorithm)
        const isBest = row.best.includes(algorithm)
        if (value === undefined) {
          return (
            <td key={algorithm} className="py-1 text-right font-mono text-fg-faint">
              —
            </td>
          )
        }

        if (baseline !== null && baseline !== algorithm) {
          const delta = deltaAgainst(row, algorithm, baseline)
          return (
            <td key={algorithm} className="py-1 text-right font-mono text-fg">
              {delta === null || delta.value === 0 ? (
                <span className="text-fg-muted">±0</span>
              ) : (
                <>
                  {delta.value > 0 ? '+' : ''}
                  {row.format(delta.value)}
                  <span className="sr-only">
                    {delta.improvement === true ? ' (better)' : ' (worse)'}
                  </span>
                </>
              )}
            </td>
          )
        }

        return (
          <td
            key={algorithm}
            className={`py-1 text-right font-mono ${isBest ? 'font-medium text-fg' : 'text-fg-muted'}`}
          >
            {baseline === algorithm ? (
              <span title="Baseline">{row.format(value)}</span>
            ) : (
              row.format(value)
            )}
            {isBest && <span className="sr-only"> (best)</span>}
            {baseline === algorithm && <span className="sr-only"> (baseline)</span>}
          </td>
        )
      })}
    </tr>
  )
}
