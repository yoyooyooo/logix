import { createRoot } from 'react-dom/client'
import { RuntimeProvider } from '@logix/react'
import { BrowserRouter } from 'react-router-dom'

import App from './app/App'
import { appRuntime } from './runtime/appRuntime'
import './style.css'

const container = document.getElementById('app')

if (!container) {
  throw new Error('Root element #app not found')
}

createRoot(container).render(
  <RuntimeProvider runtime={appRuntime} policy={{ mode: 'sync' }}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </RuntimeProvider>,
)
