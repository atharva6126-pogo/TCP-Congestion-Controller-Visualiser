import { useCallback, useEffect, useState } from 'react'

import { Dialog } from '../../components/ui/Dialog'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { useSimulation } from '../simulation/useSimulation'
import { buildShareUrl } from '../simulation/urlState'
import { downloadTextFile } from './download'
import {
  buildRunJson,
  buildStatisticsCsv,
  buildTimelineCsv,
  exportFilenameStem,
} from './exportFormats'

interface ExportDialogProps {
  open: boolean
  onClose: () => void
}

type CopyState = 'idle' | 'copied' | 'failed'

/**
 * The §3 export overlay: a shareable link to the current configuration
 * and the run in three shapes — results, timeline, statistics.
 *
 * Exports describe the runs currently loaded, so in comparison mode one
 * file covers every algorithm. With no run yet, only the link is
 * offered: a configuration is shareable before it has been run.
 */
export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { runs, config, mode, comparisonAlgorithms, comparisonView } = useSimulation()
  const [copyState, setCopyState] = useState<CopyState>('idle')

  const shareUrl = buildShareUrl({ config, mode, comparisonAlgorithms, comparisonView })
  const hasRuns = runs.size > 0
  const stem = exportFilenameStem(runs, config)

  // Each visit starts from a neutral state rather than showing the
  // outcome of a copy from a previous visit.
  useEffect(() => {
    if (open) {
      setCopyState('idle')
    }
  }, [open])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        setCopyState('copied')
      },
      () => {
        // Clipboard access can be refused (insecure context, denied
        // permission); the field itself stays selectable as a fallback.
        setCopyState('failed')
      },
    )
  }, [shareUrl])

  return (
    <Dialog open={open} onClose={onClose} label="Share and export" variant="center">
      <div className="flex flex-col gap-5 p-6">
        <section className="flex flex-col gap-2">
          <SectionLabel>Share</SectionLabel>
          <p className="text-label text-fg-muted">
            This link carries the full configuration and the seed, so it reproduces the run exactly.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              aria-label="Shareable link"
              value={shareUrl}
              onFocus={(event) => {
                event.target.select()
              }}
              className="min-w-0 flex-1 rounded border border-edge bg-raised px-2 py-1.5 font-mono text-axis text-fg-muted"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded border border-edge px-3 py-1.5 text-ui text-fg transition-colors duration-150 hover:bg-raised"
            >
              Copy
            </button>
          </div>
          <p aria-live="polite" className="min-h-[1rem] text-label text-fg-faint">
            {copyState === 'copied' && 'Link copied to the clipboard.'}
            {copyState === 'failed' &&
              'Copying was blocked — select the link and copy it manually.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>Export</SectionLabel>
          {hasRuns ? (
            <div className="flex flex-col gap-2">
              <ExportRow
                title="Results"
                detail="JSON · configuration, timeline and statistics"
                filename={`${stem}.json`}
                onExport={() => {
                  downloadTextFile(`${stem}.json`, 'application/json', buildRunJson(runs, config))
                }}
              />
              <ExportRow
                title="Timeline"
                detail="CSV · one row per simulation event"
                filename={`${stem}-timeline.csv`}
                onExport={() => {
                  downloadTextFile(`${stem}-timeline.csv`, 'text/csv', buildTimelineCsv(runs))
                }}
              />
              <ExportRow
                title="Statistics"
                detail="CSV · run totals per algorithm"
                filename={`${stem}-statistics.csv`}
                onExport={() => {
                  downloadTextFile(`${stem}-statistics.csv`, 'text/csv', buildStatisticsCsv(runs))
                }}
              />
            </div>
          ) : (
            <p className="text-label text-fg-faint">
              Run a simulation to export its results, timeline and statistics.
            </p>
          )}
        </section>
      </div>
    </Dialog>
  )
}

function ExportRow({
  title,
  detail,
  filename,
  onExport,
}: {
  title: string
  detail: string
  filename: string
  onExport: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-edge px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="text-ui text-fg">{title}</span>
        <span className="text-label text-fg-faint">{detail}</span>
      </div>
      <button
        type="button"
        onClick={onExport}
        aria-label={`Download ${title.toLowerCase()} as ${filename}`}
        className="shrink-0 rounded bg-raised px-3 py-1.5 text-ui text-fg transition-colors duration-150 hover:bg-edge"
      >
        Download
      </button>
    </div>
  )
}
