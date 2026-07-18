import { SHORTCUTS } from '../../lib/shortcuts'
import { Dialog } from '../ui/Dialog'
import { Kbd } from '../ui/Kbd'
import { SectionLabel } from '../ui/SectionLabel'

interface HelpOverlayProps {
  open: boolean
  onClose: () => void
}

/** The §3 help overlay: the keyboard shortcut reference. */
export function HelpOverlay({ open, onClose }: HelpOverlayProps) {
  return (
    <Dialog open={open} onClose={onClose} label="Keyboard shortcuts" variant="center">
      <div className="flex flex-col gap-4 p-6">
        <SectionLabel>Keyboard shortcuts</SectionLabel>
        <dl className="flex flex-col gap-3">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between gap-6 text-ui"
            >
              <dt className="text-fg-muted">{shortcut.description}</dt>
              <dd className="flex shrink-0 gap-1">
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-label text-fg-faint">More shortcuts arrive with their features.</p>
      </div>
    </Dialog>
  )
}
