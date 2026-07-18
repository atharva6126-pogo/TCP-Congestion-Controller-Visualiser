import { useMemo } from 'react'

import { SectionLabel } from '../../components/ui/SectionLabel'
import { buildTransmissions } from '../packets/transmissions'
import { useReplayClock } from '../replay/useReplayClock'
import type { SimulationTimeline } from '../simulation/timeline'
import { describeEvent, describePacket } from './derive'
import type { DetailRow } from './derive'
import { useInspector } from './useInspector'

/**
 * Complete metadata for whatever is selected: a timeline event, or one
 * transmission attempt of a packet (DESIGN_SPEC §5, §16).
 *
 * A packet the replay has not reached yet is not inspectable, so the
 * panel reports that rather than showing data from the future.
 */
export function InspectorDetails({ timeline }: { timeline: SimulationTimeline }) {
  const { currentTime } = useReplayClock()
  const { selection, clear } = useInspector()
  const transmissions = useMemo(() => buildTransmissions(timeline.events), [timeline])

  if (selection === null) {
    return null
  }

  let title: string
  let rows: DetailRow[] | null

  if (selection.kind === 'event') {
    const event = timeline.events[selection.index]
    title = 'Event'
    rows = event === undefined ? null : describeEvent(event)
  } else {
    const detail = describePacket(
      transmissions,
      selection.sequenceNumber,
      selection.attempt,
      currentTime,
    )
    title = 'Packet'
    rows = detail?.rows ?? null
  }

  return (
    <section aria-label={`${title} details`} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel>{title}</SectionLabel>
        <button
          type="button"
          onClick={clear}
          className="rounded px-1 text-label text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg"
        >
          Close
        </button>
      </div>
      {rows === null ? (
        <p className="text-label text-fg-faint">Not yet reached at this point in the replay.</p>
      ) : (
        <dl className="flex flex-col gap-1">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-label text-fg-muted">{row.label}</dt>
              <dd className="truncate font-mono text-axis text-fg">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
