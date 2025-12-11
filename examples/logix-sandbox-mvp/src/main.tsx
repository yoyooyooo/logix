import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './style.css'
import { SandboxRuntimeProvider } from './RuntimeProvider'

createRoot(document.getElementById('app')!).render(
  <SandboxRuntimeProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </SandboxRuntimeProvider>,
)
