import type { ReactNode } from 'react'

interface IconButtonProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  disabledHint?: string
  children: ReactNode
}

/** Square icon-only button with the app's hover/focus/disabled treatment. */
export function IconButton({ label, onClick, disabled, disabledHint, children }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={disabled ? disabledHint : label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg disabled:text-fg-faint disabled:hover:bg-transparent"
    >
      {children}
    </button>
  )
}
