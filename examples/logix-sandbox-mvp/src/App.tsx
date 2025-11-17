import React from 'react'
import { Routes as RouterRoutes, Route as RouterRoute } from 'react-router-dom'
import { IrPage } from './pages/ir/IrPage'
import { SandboxPlaygroundPage } from './pages/playground/SandboxPlaygroundPage'
import { RuntimeAlignmentLabPage } from './pages/runtime-alignment-lab/RuntimeAlignmentLabPage'

// Cast router components to any to avoid JSX typing friction in this example project.
const Routes: any = RouterRoutes
const Route: any = RouterRoute

export default function App() {
  return (
    <Routes>
      <Route path="/ir" element={<IrPage />} />
      <Route path="/playground" element={<SandboxPlaygroundPage />} />
      <Route path="*" element={<RuntimeAlignmentLabPage />} />
    </Routes>
  )
}
