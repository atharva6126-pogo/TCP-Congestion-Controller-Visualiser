import { useId, useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

import { LossMarkerShape } from '../charts/LossMarkerShape'
import { useReplayClock } from '../replay/useReplayClock'
import { ALGORITHM_COLOR_VAR, ALGORITHM_LABEL } from '../simulation/algorithmColors'
import type { AlgorithmName } from '../simulation/timeline'
import {
  buildAlgorithmSeries,
  buildComparisonPoints,
  GHOST_KEY_PREFIX,
  lockedWindowDomain,
  PAST_KEY_PREFIX,
  toOverlayRows,
} from './comparisonSeries'
import type { AlgorithmSeries, OverlayRow, RunMap } from './comparisonSeries'

const GHOST_OPACITY = 0.15
/** Overlay markers are smaller so four algorithms stay legible (§15). */
const OVERLAY_MARKER_SIZE = 3.5
const AXIS_TICK = { fill: 'var(--fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }

interface ComparisonChartProps {
  runs: RunMap
  view: 'overlay' | 'small_multiples'
  focused: AlgorithmName
}

/**
 * Congestion windows of several algorithms under identical conditions
 * (DESIGN_SPEC §15), either overlaid or as one cell each.
 *
 * Like every other visual, it owns no time: the cursor comes from the
 * replay clock and each line is split into the part already replayed
 * and the ghost beyond it. Phase bands are deliberately absent — with
 * several algorithms on one axis they would be ambiguous.
 */
export function ComparisonChart({ runs, view, focused }: ComparisonChartProps) {
  const { currentTime, duration } = useReplayClock()
  const descriptionId = useId()

  const list = useMemo(() => buildAlgorithmSeries(runs), [runs])
  const points = useMemo(() => buildComparisonPoints(list), [list])
  const algorithms = useMemo(() => list.map((entry) => entry.algorithm), [list])
  const rows = useMemo(
    () => toOverlayRows(points, algorithms, currentTime, duration),
    [points, algorithms, currentTime, duration],
  )
  const yDomain = useMemo(() => lockedWindowDomain(list), [list])

  if (list.length === 0) {
    return null
  }

  const description = `Congestion window over time for ${list
    .map((entry) => ALGORITHM_LABEL[entry.algorithm])
    .join(
      ', ',
    )}, under identical network conditions and the same seed. Peak window ${yDomain[1]} segments.`

  return (
    <figure className="flex h-full min-h-0 flex-col gap-2" aria-describedby={descriptionId}>
      <p id={descriptionId} className="sr-only">
        {description}
      </p>
      {view === 'overlay' ? (
        <Overlay
          rows={rows}
          list={list}
          focused={focused}
          currentTime={currentTime}
          duration={duration}
          yDomain={yDomain}
        />
      ) : (
        <SmallMultiples
          rows={rows}
          list={list}
          focused={focused}
          currentTime={currentTime}
          duration={duration}
          yDomain={yDomain}
        />
      )}
    </figure>
  )
}

interface ViewProps {
  rows: OverlayRow[]
  list: AlgorithmSeries[]
  focused: AlgorithmName
  currentTime: number
  duration: number
  yDomain: [number, number]
}

function Overlay({ rows, list, focused, currentTime, duration, yDomain }: ViewProps) {
  return (
    <div className="min-h-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--border-hairline)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            type="number"
            dataKey="time"
            domain={[0, duration]}
            allowDataOverflow
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-hairline)' }}
            tickFormatter={(value: number) => `${value.toFixed(1)}s`}
          />
          <YAxis
            type="number"
            domain={yDomain}
            allowDecimals={false}
            width={44}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />

          {list.map((entry) => (
            <Line
              key={`ghost-${entry.algorithm}`}
              dataKey={`${GHOST_KEY_PREFIX}${entry.algorithm}`}
              type="stepAfter"
              stroke={ALGORITHM_COLOR_VAR[entry.algorithm]}
              strokeOpacity={GHOST_OPACITY}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          ))}
          {list.map((entry) => (
            <Line
              key={`past-${entry.algorithm}`}
              dataKey={`${PAST_KEY_PREFIX}${entry.algorithm}`}
              type="stepAfter"
              stroke={ALGORITHM_COLOR_VAR[entry.algorithm]}
              strokeWidth={entry.algorithm === focused ? 2.5 : 1.25}
              strokeOpacity={entry.algorithm === focused ? 1 : 0.75}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          ))}

          {list.flatMap((entry) =>
            entry.series.lossMarkers
              .filter((marker) => marker.time <= currentTime)
              .map((marker) => (
                <ReferenceDot
                  key={`marker-${entry.algorithm}-${marker.time}-${marker.kind}`}
                  x={marker.time}
                  y={marker.cwnd}
                  shape={<LossMarkerShape kind={marker.kind} size={OVERLAY_MARKER_SIZE} />}
                />
              )),
          )}

          <ReferenceLine x={currentTime} stroke="var(--fg-muted)" strokeWidth={1} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function SmallMultiples({ rows, list, focused, currentTime, duration, yDomain }: ViewProps) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
      {list.map((entry) => (
        <figure key={entry.algorithm} className="flex min-h-0 flex-col">
          <figcaption
            className={`px-1 text-label ${
              entry.algorithm === focused ? 'font-medium text-fg' : 'text-fg-muted'
            }`}
            style={{ color: ALGORITHM_COLOR_VAR[entry.algorithm] }}
          >
            {ALGORITHM_LABEL[entry.algorithm]}
          </figcaption>
          <div className="min-h-[120px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid
                  stroke="var(--border-hairline)"
                  strokeDasharray="2 4"
                  vertical={false}
                />
                <XAxis
                  type="number"
                  dataKey="time"
                  domain={[0, duration]}
                  allowDataOverflow
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-hairline)' }}
                  tickFormatter={(value: number) => `${value.toFixed(1)}s`}
                />
                {/* One domain across every cell keeps the cells comparable (§15). */}
                <YAxis
                  type="number"
                  domain={yDomain}
                  allowDecimals={false}
                  width={36}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                />
                <Line
                  dataKey={`${GHOST_KEY_PREFIX}${entry.algorithm}`}
                  type="stepAfter"
                  stroke={ALGORITHM_COLOR_VAR[entry.algorithm]}
                  strokeOpacity={GHOST_OPACITY}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey={`${PAST_KEY_PREFIX}${entry.algorithm}`}
                  type="stepAfter"
                  stroke={ALGORITHM_COLOR_VAR[entry.algorithm]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                {entry.series.lossMarkers
                  .filter((marker) => marker.time <= currentTime)
                  .map((marker) => (
                    <ReferenceDot
                      key={`marker-${marker.time}-${marker.kind}`}
                      x={marker.time}
                      y={marker.cwnd}
                      shape={<LossMarkerShape kind={marker.kind} size={OVERLAY_MARKER_SIZE} />}
                    />
                  ))}
                <ReferenceLine x={currentTime} stroke="var(--fg-muted)" strokeWidth={1} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </figure>
      ))}
    </div>
  )
}
