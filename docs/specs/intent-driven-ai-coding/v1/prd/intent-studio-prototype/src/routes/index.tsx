import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from '../App'
import { Dashboard } from './dashboard'
import { IntentsList } from './intents-list'
import { IntentCreateRoute } from './intent-create'
import { IntentPage } from './intent-page'
import { PatternsRoute } from './patterns'
import { PatternDetail } from './pattern-detail'
import { PatternCreateRoute } from './pattern-create'
import { PatternEditRoute } from './pattern-edit'
import { PatternRegistryRoute } from './pattern-registry'
import { AssetsCenter } from './assets'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />, // App renders shell (sidebar + main area) and uses Outlet
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'intents', element: <IntentsList /> },
      { path: 'intents/new', element: <IntentCreateRoute /> },
      { path: 'intents/:intentId', element: <IntentPage /> },
      { path: 'patterns', element: <PatternsRoute /> },
      { path: 'patterns/new', element: <PatternCreateRoute /> },
      { path: 'patterns/:patternId/edit', element: <PatternEditRoute /> },
      { path: 'patterns/:patternId/registry', element: <PatternRegistryRoute /> },
      { path: 'patterns/:patternId', element: <PatternDetail /> },
      { path: 'assets', element: <AssetsCenter /> },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
