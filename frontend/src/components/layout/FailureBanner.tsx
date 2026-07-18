import { useSimulation } from '../../features/simulation/useSimulation'

/**
 * Failure notice above the transport bar (DESIGN_SPEC §13). It never
 * clears the previous run, states the problem plainly, and carries the
 * seed so the failing run can be reproduced.
 */
export function FailureBanner() {
  const { failure, runSimulation, dismissFailure, isRunning } = useSimulation()
  if (failure === null) {
    return null
  }

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-t border-danger/40 bg-danger/10 px-4 py-2"
    >
      <p className="min-w-0 flex-1 text-ui text-fg">
        {failure.message}{' '}
        <span className="text-fg-muted">
          Seed <span className="font-mono">{failure.seed}</span>.
        </span>
      </p>
      <button
        type="button"
        disabled={isRunning}
        onClick={runSimulation}
        className="rounded px-2 py-1 text-label text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg disabled:text-fg-faint"
      >
        Retry
      </button>
      <button
        type="button"
        onClick={dismissFailure}
        className="rounded px-2 py-1 text-label text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg"
      >
        Dismiss
      </button>
    </div>
  )
}
