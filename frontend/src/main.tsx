import '@fontsource-variable/inter/index.css'
import '@fontsource-variable/jetbrains-mono/index.css'
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App.tsx'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root container #root is missing from index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
