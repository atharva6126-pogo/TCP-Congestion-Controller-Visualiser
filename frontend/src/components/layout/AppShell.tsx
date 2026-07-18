import { useCallback, useMemo, useState } from 'react'

import { ExportDialog } from '../../features/export/ExportDialog'
import { ReplayAnnouncer } from '../../features/replay/ReplayAnnouncer'
import { useReplayControls } from '../../features/replay/useReplayControls'
import { useSimulation } from '../../features/simulation/useSimulation'
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
  const { mode, setMode, runs, runSimulation } = useSimulation()
  const [configCollapsed, setConfigCollapsed] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [statsDrawerOpen, setStatsDrawerOpen] = useState(false)

  /**
   * Loss instants across every loaded run, so Shift+←/→ jumps to the
   * moments that explain the shape of the curve (§6). In comparison
   * mode the runs share one clock, so their losses share one list.
   */
  const lossTimestamps = useMemo(() => {
    const times = new Set<number>()
    for (const run of runs.values()) {
      for (const event of run.timeline.events) {
        if (event.eventType === 'packet_lost') {
          times.add(event.timestamp)
        }
      }
    }
    return [...times].sort((a, b) => a - b)
  }, [runs])

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

  // Switching mode re-dresses the config rail; the new set of runs
  // arrives when the user runs the simulation again (§15).
  const toggleComparison = useCallback(() => {
    setMode(mode === 'single' ? 'comparison' : 'single')
  }, [mode, setMode])

  const jumpToNextLoss = useCallback(() => {
    const now = clock.getCurrentTime()
    const next = lossTimestamps.find((timestamp) => timestamp > now)
    if (next !== undefined) {
      clock.seek(next)
    }
  }, [clock, lossTimestamps])

  const jumpToPreviousLoss = useCallback(() => {
    const now = clock.getCurrentTime()
    const previous = lossTimestamps.filter((timestamp) => timestamp < now).at(-1)
    if (previous !== undefined) {
      clock.seek(previous)
    }
  }, [clock, lossTimestamps])

  useGlobalShortcuts({
    toggleHelp,
    toggleConfigRail,
    toggleReplay,
    stepForward: clock.stepForward,
    stepBackward: clock.stepBackward,
    jumpToNextLoss,
    jumpToPreviousLoss,
    toggleComparison,
    rerun: runSimulation,
    setSpeed: clock.setSpeed,
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
      <ReplayAnnouncer />
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
        onOpenExport={() => {
          setExportOpen(true)
        }}
      />

      <HelpOverlay
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false)
        }}
      />
      <ExportDialog
        open={exportOpen}
        onClose={() => {
          setExportOpen(false)
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
