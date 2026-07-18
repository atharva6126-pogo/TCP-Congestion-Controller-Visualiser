import { IconButton } from '../ui/IconButton'
import { ChevronGlyph } from './glyphs'
import { ConfigRailContent } from './ConfigRailContent'

interface ConfigRailProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

/**
 * Left rail — simulation configuration (§4). Collapsible (⌘\) so the
 * stage can take the full width during presentation; when collapsed it
 * narrows to a strip holding only the expand control.
 */
export function ConfigRail({ collapsed, onToggleCollapsed }: ConfigRailProps) {
  return (
    <aside
      aria-label="Simulation configuration"
      className="relative h-full overflow-hidden border-r border-edge bg-surface"
    >
      {collapsed ? (
        <div className="flex justify-center py-2">
          <IconButton label="Expand configuration rail" onClick={onToggleCollapsed}>
            <ChevronGlyph direction="right" />
          </IconButton>
        </div>
      ) : (
        <>
          <div className="absolute top-2 right-2">
            <IconButton label="Collapse configuration rail" onClick={onToggleCollapsed}>
              <ChevronGlyph direction="left" />
            </IconButton>
          </div>
          <ConfigRailContent />
        </>
      )}
    </aside>
  )
}
