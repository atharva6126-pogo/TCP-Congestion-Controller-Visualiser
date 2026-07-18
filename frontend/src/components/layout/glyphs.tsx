/** Inline 16px stroke glyphs shared by the shell's controls. */

export function PlayGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <path d="M5 3.5v9l7-4.5z" />
    </svg>
  )
}

export function PauseGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
      <path d="M4.5 3.5h2.5v9H4.5zM9 3.5h2.5v9H9z" />
    </svg>
  )
}

export function ChevronGlyph({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`size-4 ${direction === 'left' ? '' : 'rotate-180'}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M10 3.5 5.5 8l4.5 4.5" />
    </svg>
  )
}

export function SlidersGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 5h12M2 11h12" />
      <circle cx="6" cy="5" r="1.75" fill="var(--surface-base)" />
      <circle cx="10" cy="11" r="1.75" fill="var(--surface-base)" />
    </svg>
  )
}

export function ColumnsGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2.5" y="3" width="11" height="10" rx="1" />
      <path d="M9.5 3v10" />
    </svg>
  )
}

export function ShareGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M8 10.5V2.5M5 5.5 8 2.5l3 3" />
      <path d="M3.5 9.5v3a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-3" />
    </svg>
  )
}

export function QuestionGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M5.75 6a2.25 2.25 0 1 1 3.37 1.95c-.7.4-1.12.8-1.12 1.55v.25" />
      <circle cx="8" cy="12.25" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
