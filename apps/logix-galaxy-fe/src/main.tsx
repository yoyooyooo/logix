import { createRoot } from 'react-dom/client'
import './style.css'
import { SandboxRuntimeProvider } from './RuntimeProvider'
import { AppRouter } from './routes/router'

const container = document.getElementById('app')

if (!container) {
  throw new Error('Root element #app not found')
}

createRoot(container).render(
  <SandboxRuntimeProvider>
    <AppRouter />
  </SandboxRuntimeProvider>,
)
