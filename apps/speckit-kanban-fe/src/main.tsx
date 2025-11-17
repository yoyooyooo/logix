import { createRoot } from 'react-dom/client'

import App from './app/App'
import './style.css'

const container = document.getElementById('app')

if (!container) {
  throw new Error('Root element #app not found')
}

createRoot(container).render(<App />)

