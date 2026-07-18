import { ConfigPanel } from '../../features/simulation/ConfigPanel'
import { useTheme } from '../../features/theme/useTheme'

/**
 * Inner content of the configuration rail, shared between the desktop
 * aside and the small-viewport drawer (§17). The configuration draft
 * itself lives in the simulation provider, so both instances edit one
 * form.
 */
export function ConfigRailContent() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <header>
        <h1 className="text-section font-semibold text-fg">TCP Congestion Control</h1>
        <p className="mt-1 text-label text-fg-muted">Visualizer</p>
      </header>

      <ConfigPanel />

      <div className="flex-1" />

      <button
        type="button"
        onClick={toggleTheme}
        className="self-start rounded px-2 py-1 text-label text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg"
      >
        {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      </button>
    </div>
  )
}
