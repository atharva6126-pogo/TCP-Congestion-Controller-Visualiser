import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export type DialogVariant = 'center' | 'drawer-left' | 'drawer-right'

interface DialogProps {
  open: boolean
  onClose: () => void
  label: string
  variant: DialogVariant
  children: ReactNode
}

const VARIANT_CLASSES: Record<DialogVariant, string> = {
  center: 'm-auto w-full max-w-md rounded-lg border border-edge',
  'drawer-left': 'mr-auto ml-0 h-dvh max-h-none w-[280px] border-r border-edge',
  'drawer-right': 'ml-auto mr-0 h-dvh max-h-none w-[300px] border-l border-edge',
}

/**
 * Modal built on the native <dialog> element: focus containment, Esc to
 * close, and focus return come from the platform. Clicking the backdrop
 * closes. Used by the help overlay (center) and the small-viewport rail
 * drawers (§17).
 */
export function Dialog({ open, onClose, label, variant, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) {
      return
    }
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(event) => {
        // Only the backdrop registers the dialog element itself as target.
        if (event.target === ref.current) {
          onClose()
        }
      }}
      className={`bg-surface p-0 text-fg backdrop:bg-black/50 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </dialog>
  )
}
