import { useCallback } from 'react'

import { SectionLabel } from '../../components/ui/SectionLabel'
import { useReplayClock } from '../replay/useReplayClock'
import type { SimulationTimeline } from '../simulation/timeline'
import { currentEventIndex } from './derive'
import { EventList } from './EventList'
import { useInspector } from './useInspector'

/**
 * Every event the replay has reached, in order (DESIGN_SPEC §5).
 *
 * Reads the cursor from the replay clock and owns no time of its own;
 * choosing an event seeks the clock, so the list, the visualizations,
 * and the transport bar always agree.
 */
export function TimelineInspector({ timeline }: { timeline: SimulationTimeline }) {
  const { currentTime, seek } = useReplayClock()
  const { selection, select, clear } = useInspector()

  const index = currentEventIndex(timeline.events, currentTime)
  const selectedIndex = selection?.kind === 'event' ? selection.index : null

  const handleSelect = useCallback(
    (nextIndex: number) => {
      const event = timeline.events[nextIndex]
      if (event === undefined) {
        return
      }
      select({ kind: 'event', index: nextIndex })
      seek(event.timestamp)
    },
    [timeline, select, seek],
  )

  const handleOpenPacket = useCallback(
    (nextIndex: number) => {
      const event = timeline.events[nextIndex]
      if (event?.packet === undefined) {
        return
      }
      // Which attempt this event belongs to is resolved by the packet
      // inspector from the cursor; the sequence identifies the segment.
      select({
        kind: 'packet',
        sequenceNumber: event.packet.sequenceNumber,
        attempt: attemptAt(timeline, nextIndex, event.packet.sequenceNumber),
      })
    },
    [timeline, select],
  )

  return (
    <section aria-label="Timeline events" className="flex min-h-0 flex-1 flex-col gap-2">
      <SectionLabel>Timeline</SectionLabel>
      <EventList
        events={timeline.events}
        currentIndex={index}
        selectedIndex={selectedIndex}
        onSelect={handleSelect}
        onOpenPacket={handleOpenPacket}
        onClear={clear}
      />
    </section>
  )
}

/** How many sends of this segment precede `index` — i.e. its attempt number. */
function attemptAt(timeline: SimulationTimeline, index: number, sequenceNumber: number): number {
  let attempt = 0
  for (let position = 0; position < index; position += 1) {
    const event = timeline.events[position]
    if (event?.eventType === 'packet_sent' && event.packet?.sequenceNumber === sequenceNumber) {
      attempt += 1
    }
  }
  // A send event is itself the start of the attempt it belongs to.
  const event = timeline.events[index]
  return event?.eventType === 'packet_sent' ? attempt : Math.max(attempt - 1, 0)
}
