import { AppProviders } from './app/AppProviders'
import { AppShell } from './components/layout/AppShell'

export function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  )
}
