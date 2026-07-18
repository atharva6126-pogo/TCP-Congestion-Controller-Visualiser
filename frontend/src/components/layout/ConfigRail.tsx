import { useTheme } from '../../features/theme/useTheme'

/**
 * Left rail — simulation configuration (DESIGN_SPEC §4).
 *
 * Foundation scope: app identity and the theme control. Algorithm,
 * link, transfer, and preset controls arrive with the simulation
 * controls task.
 */
export function ConfigRail() {
  const { theme, toggleTheme } = useTheme()

  return (
    <aside
      aria-label="Simulation configuration"
      className="flex h-full flex-col border-r border-edge bg-surface p-4"
    >
      <header>
        <h1 className="text-section font-semibold text-fg">TCP Congestion Control</h1>
        <p className="mt-1 text-label text-fg-muted">Visualizer</p>
      </header>

      <div className="flex-1" />

      <button
        type="button"
        onClick={toggleTheme}
        className="self-start rounded px-2 py-1 text-label text-fg-muted transition-colors duration-150 hover:bg-raised hover:text-fg"
      >
        {theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      </button>
    </aside>
  )
}
