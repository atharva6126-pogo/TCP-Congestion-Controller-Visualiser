import { useCallback, useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useReplayClock } from '../replay/useReplayClock'
import { ALGORITHM_COLOR_VAR, ALGORITHM_LABEL } from '../simulation/algorithmColors'
import type { CongestionPhase, SimulationTimeline } from '../simulation/timeline'
import { buildCwndSeries, toChartPoints } from './cwndSeries'
import { CwndTooltip } from './CwndTooltip'
import { LossMarkerShape } from './LossMarkerShape'
import { PHASE_BAND_FILL, PHASE_BAND_OPACITY, PHASE_LABEL, PHASE_SHORT_LABEL } from './phases'

/** The already-replayed line is solid; the rest is the §14 ghost. */
const GHOST_OPACITY = 0.15
const AXIS_TICK = { fill: 'var(--fg-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }

interface CwndChartProps {
  timeline: SimulationTimeline
}

/**
 * Congestion window over simulation time (DESIGN_SPEC §14).
 *
 * The chart holds no time of its own: the cursor comes from the
 * ReplayClock and every drawn value is a pure function of (timeline,
 * cursor). Recharts' own animations are disabled so the replay clock
 * is the only thing that moves — which is also what keeps the chart
 * deterministic under seek, speed changes, and repeated replays.
 */
export function CwndChart({ timeline }: CwndChartProps) {
  const { currentTime, duration } = useReplayClock()

  const series = useMemo(() => buildCwndSeries(timeline), [timeline])
  const points = useMemo(
    () => toChartPoints(series.samples, currentTime, timeline.durationSeconds),
    [series, currentTime, timeline],
  )

  const phaseAt = useCallback(
    (time: number): CongestionPhase | null =>
      series.phaseSpans.find((span) => time >= span.startTime && time <= span.endTime)?.phase ??
      null,
    [series],
  )

  const color = ALGORITHM_COLOR_VAR[timeline.algorithm]
  const xDomain: [number, number] = [0, duration > 0 ? duration : timeline.durationSeconds]
  const yDomain: [number, number] = [0, Math.ceil(series.maxCwnd + 1)]

  return (
    <figure className="flex h-full flex-col gap-2">
      <figcaption className="flex items-baseline gap-2 px-1">
        <span className="text-label font-medium tracking-[0.06em] text-fg-faint uppercase">
          Congestion window
        </span>
        <span className="font-mono text-label" style={{ color }}>
          {ALGORITHM_LABEL[timeline.algorithm]}
        </span>
      </figcaption>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 16, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--border-hairline)" strokeDasharray="2 4" vertical={false} />

            {series.phaseSpans.map((span) => (
              <ReferenceArea
                key={`${span.phase}:${span.startTime}`}
                x1={span.startTime}
                x2={span.endTime}
                fill={PHASE_BAND_FILL[span.phase]}
                fillOpacity={PHASE_BAND_OPACITY[span.phase]}
                strokeOpacity={0}
                label={
                  span.labelled
                    ? {
                        value: PHASE_SHORT_LABEL[span.phase],
                        position: 'insideTopLeft',
                        fill: 'var(--fg-faint)',
                        fontSize: 11,
                      }
                    : undefined
                }
              />
            ))}

            <XAxis
              type="number"
              dataKey="time"
              domain={xDomain}
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
              label={{
                value: 'segments',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--fg-faint)',
                fontSize: 11,
              }}
            />

            <Tooltip
              content={<CwndTooltip phaseAt={phaseAt} />}
              cursor={{ stroke: 'var(--fg-faint)', strokeWidth: 1 }}
              isAnimationActive={false}
            />

            {/* The whole shape is already computed; the unreached part is a ghost. */}
            <Line
              dataKey="future"
              type="stepAfter"
              stroke={color}
              strokeOpacity={GHOST_OPACITY}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="past"
              type="stepAfter"
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, fill: color, stroke: 'none' }}
              isAnimationActive={false}
            />

            {series.lossMarkers
              .filter((marker) => marker.time <= currentTime)
              .map((marker) => (
                <ReferenceLine
                  key={`hairline:${marker.time}:${marker.kind}`}
                  x={marker.time}
                  stroke="var(--status-danger)"
                  strokeWidth={1}
                  strokeOpacity={0.35}
                />
              ))}
            {series.lossMarkers
              .filter((marker) => marker.time <= currentTime)
              .map((marker) => (
                <ReferenceDot
                  key={`marker:${marker.time}:${marker.kind}`}
                  x={marker.time}
                  y={marker.cwnd}
                  shape={<LossMarkerShape kind={marker.kind} />}
                />
              ))}

            <ReferenceLine x={currentTime} stroke="var(--fg-muted)" strokeWidth={1} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <CwndDataTable timeline={timeline} samples={series.samples} />
    </figure>
  )
}

/**
 * Off-screen table alternative to the chart (DESIGN_SPEC §18), giving
 * screen readers and keyboard users the same series the line draws.
 */
function CwndDataTable({
  timeline,
  samples,
}: {
  timeline: SimulationTimeline
  samples: readonly { time: number; cwnd: number; phase: CongestionPhase }[]
}) {
  return (
    <table className="sr-only">
      <caption>
        Congestion window over time for {ALGORITHM_LABEL[timeline.algorithm]}, in segments
      </caption>
      <thead>
        <tr>
          <th scope="col">Time (seconds)</th>
          <th scope="col">Congestion window (segments)</th>
          <th scope="col">Phase</th>
        </tr>
      </thead>
      <tbody>
        {samples.map((sample) => (
          <tr key={sample.time}>
            <td>{sample.time.toFixed(3)}</td>
            <td>{sample.cwnd.toFixed(2)}</td>
            <td>{PHASE_LABEL[sample.phase]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
