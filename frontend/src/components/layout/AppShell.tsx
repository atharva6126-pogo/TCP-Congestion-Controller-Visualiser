import { useCallback, useState } from 'react'

import { useReplayControls } from '../../features/replay/useReplayControls'
import { useGlobalShortcuts } from '../../lib/useGlobalShortcuts'
import { Dialog } from '../ui/Dialog'
import { ConfigRail } from './ConfigRail'
import { ConfigRailContent } from './ConfigRailContent'
import { FailureBanner } from './FailureBanner'
import { HelpOverlay } from './HelpOverlay'
import { Stage } from './Stage'
import { StatsRail } from './StatsRail'
import { StatsRailContent } from './StatsRailContent'
import { TransportBar } from './TransportBar'

/**
 * Three-rail workspace grid with a persistent transport bar (§4, §17):
 *
 * - ≥1280px (xl): config rail · stage · stats rail
 * - 1024–1279px (lg): config rail · stage; stats reachable via drawer
 * - <1024px: stage only; both rails become edge drawers
 *
 * The config rail collapses to a strip (⌘\) to hand the stage the full
 * width during presentation.
 */
export function AppShell() {
  const clock = useReplayControls()
  const [configCollapsed, setConfigCollapsed] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [statsDrawerOpen, setStatsDrawerOpen] = useState(false)

  const toggleHelp = useCallback(() => {
    setHelpOpen((open) => !open)
  }, [])

  const toggleConfigRail = useCallback(() => {
    setConfigCollapsed((collapsed) => !collapsed)
  }, [])

  const toggleReplay = useCallback(() => {
    if (clock.duration === 0) {
      return
    }
    if (clock.isPlaying) {
      clock.pause()
    } else {
      clock.play()
    }
  }, [clock])

  useGlobalShortcuts({
    toggleHelp,
    toggleConfigRail,
    toggleReplay,
    stepForward: clock.stepForward,
    stepBackward: clock.stepBackward,
  })

  const columns = configCollapsed
    ? 'lg:grid-cols-[48px_minmax(0,1fr)] xl:grid-cols-[48px_minmax(0,1fr)_300px]'
    : 'lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]'

  return (
    <div className="grid h-dvh grid-rows-[minmax(0,1fr)_auto_auto]">
      <div
        className={`grid min-h-0 grid-cols-1 transition-[grid-template-columns] duration-200 ease-out ${columns}`}
      >
        <div className="hidden lg:block">
          <ConfigRail collapsed={configCollapsed} onToggleCollapsed={toggleConfigRail} />
        </div>
        <Stage />
        <StatsRail />
      </div>
      <FailureBanner />
      <TransportBar
        onOpenConfigDrawer={() => {
          setConfigDrawerOpen(true)
        }}
        onOpenStatsDrawer={() => {
          setStatsDrawerOpen(true)
        }}
        onOpenHelp={() => {
          setHelpOpen(true)
        }}
      />

      <HelpOverlay
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false)
        }}
      />
      <Dialog
        open={configDrawerOpen}
        onClose={() => {
          setConfigDrawerOpen(false)
        }}
        label="Simulation configuration"
        variant="drawer-left"
      >
        <ConfigRailContent />
      </Dialog>
      <Dialog
        open={statsDrawerOpen}
        onClose={() => {
          setStatsDrawerOpen(false)
        }}
        label="Run statistics and inspectors"
        variant="drawer-right"
      >
        <StatsRailContent />
      </Dialog>
    </div>
  )
}
