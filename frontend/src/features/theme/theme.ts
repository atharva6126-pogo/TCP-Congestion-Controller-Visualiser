export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'tcp-visualizer.theme'

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light'
}

/** Stored preference if any, otherwise the OS preference (dark-first). */
export function resolveInitialTheme(): Theme {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (isTheme(stored)) {
    return stored
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}
