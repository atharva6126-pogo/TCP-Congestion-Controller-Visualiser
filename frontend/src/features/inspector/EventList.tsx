import { memo, useRef } from 'react'

import type { SimulationEvent } from '../simulation/timeline'
import { EventRow } from './EventRow'

interface EventListProps {
  events: readonly SimulationEvent[]
  /** Index of the event at the replay cursor; -1 before the first. */
  currentIndex: number
  selectedIndex: number | null
  onSelect: (index: number) => void
  onOpenPacket: (index: number) => void
  onClear: () => void
}

/**
 * The replay log: every event up to the cursor, newest last, with the
 * current event marked.
 *
 * Memoized on the current index rather than on time, so during
 * playback it re-renders when the cursor crosses an event — not on
 * every animation frame.
 */
export const EventList = memo(function EventList({
  events,
  currentIndex,
  selectedIndex,
  onSelect,
  onOpenPacket,
  onClear,
}: EventListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const visible = events.slice(0, currentIndex + 1)

  const moveSelection = (delta: number) => {
    const from = selectedIndex ?? currentIndex
    const next = Math.min(Math.max(from + delta, 0), currentIndex)
    if (next !== from || selectedIndex === null) {
      onSelect(next)
      listRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus()
    }
  }

  if (visible.length === 0) {
    return (
      <p className="px-2 py-1 text-label text-fg-faint">
        Events appear here as the replay reaches them.
      </p>
    )
  }

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Timeline events"
      tabIndex={selectedIndex === null ? 0 : -1}
      className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          event.stopPropagation()
          moveSelection(1)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          event.stopPropagation()
          moveSelection(-1)
        } else if (event.key === 'Enter' && selectedIndex !== null) {
          event.preventDefault()
          onOpenPacket(selectedIndex)
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onClear()
        }
      }}
    >
      {visible.map((simulationEvent, index) => (
        <EventRow
          key={`${simulationEvent.timestamp}:${index}`}
          event={simulationEvent}
          index={index}
          isCurrent={index === currentIndex}
          isSelected={index === selectedIndex}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
})
