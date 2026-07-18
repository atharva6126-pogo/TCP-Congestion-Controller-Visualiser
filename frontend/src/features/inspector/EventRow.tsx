import { memo, useEffect, useRef } from 'react'

import { EVENT_TYPE_LABEL, lossKindOf, summarizeEvent } from './derive'
import type { SimulationEvent } from '../simulation/timeline'

interface EventRowProps {
  event: SimulationEvent
  index: number
  /** The event the replay cursor is currently on. */
  isCurrent: boolean
  isSelected: boolean
  onSelect: (index: number) => void
}

/** Loss kinds are distinguished by shape, never color alone (§14, §18). */
const LOSS_GLYPH = {
  timeout: '◇',
  triple_duplicate_ack: '△',
} as const

const LOSS_TITLE = {
  timeout: 'Timeout',
  triple_duplicate_ack: 'Triple duplicate ACK',
} as const

export const EventRow = memo(function EventRow({
  event,
  index,
  isCurrent,
  isSelected,
  onSelect,
}: EventRowProps) {
  const ref = useRef<HTMLLIElement>(null)
  const lossKind = lossKindOf(event)
  const summary = summarizeEvent(event)

  useEffect(() => {
    if (isCurrent) {
      ref.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [isCurrent])

  return (
    <li
      ref={ref}
      role="option"
      aria-selected={isSelected}
      aria-current={isCurrent ? 'true' : undefined}
      data-index={index}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => {
        onSelect(index)
      }}
      className={`flex cursor-pointer items-baseline gap-2 rounded px-2 py-1 ${
        isSelected ? 'bg-raised' : 'hover:bg-raised/60'
      } ${isCurrent ? 'border-l-2 border-l-fg-muted' : 'border-l-2 border-l-transparent'}`}
    >
      <span className="font-mono text-label text-fg-faint">{event.timestamp.toFixed(3)}</span>
      <span className="text-label text-fg">{EVENT_TYPE_LABEL[event.eventType]}</span>
      {lossKind !== null && (
        <span className="text-label text-danger" title={LOSS_TITLE[lossKind]}>
          {LOSS_GLYPH[lossKind]}
          <span className="sr-only">{LOSS_TITLE[lossKind]}</span>
        </span>
      )}
      {summary !== '' && (
        <span className="ml-auto truncate font-mono text-label text-fg-muted">{summary}</span>
      )}
    </li>
  )
})
