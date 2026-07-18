import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { ThemeContext } from './ThemeContext'
import { applyTheme, resolveInitialTheme, THEME_STORAGE_KEY } from './theme'
import type { Theme } from './theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  return <ThemeContext value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext>
}
