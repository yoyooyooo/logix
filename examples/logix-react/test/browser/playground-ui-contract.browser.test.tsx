import { expect, test } from 'vitest'
import React from 'react'
import { cleanup, render } from 'vitest-browser-react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LogixReactPlaygroundRoute } from '../../src/playground/routes'
import '../../src/style.css'

const PlaygroundHarness = ({ route }: { readonly route: string }) => (
  <MemoryRouter initialEntries={[route]}>
    <Routes>
      <Route path="/playground" element={<LogixReactPlaygroundRoute />} />
      <Route path="/playground/:id" element={<LogixReactPlaygroundRoute />} />
    </Routes>
  </MemoryRouter>
)

test('default desktop workbench exposes required UI contract regions without page overflow', async () => {
  const screen = await render(<PlaygroundHarness route="/playground/logix-react.local-counter" />)

  try {
    await expect.element(screen.getByText('Logix Playground')).toBeInTheDocument()
    await expect.element(document.querySelector<HTMLElement>('[data-playground-region="top-command-bar"] button')).toBeInTheDocument()
    await expect.element(screen.getByRole('navigation', { name: 'File navigator' })).toBeInTheDocument()
    await expect.element(screen.getByLabelText('Source editor')).toBeInTheDocument()
    await expect.element(screen.getByRole('region', { name: 'Runtime inspector' })).toBeInTheDocument()
    await expect.element(screen.getByRole('region', { name: 'Workbench bottom console' })).toBeInTheDocument()
    expect(document.querySelector('[data-playground-region="top-command-bar"]')).toBeTruthy()
    expect(document.querySelector('[data-playground-region="files-panel"]')).toBeTruthy()
    expect(document.querySelector('[data-playground-region="source-editor"]')).toBeTruthy()
    expect(document.querySelector('[data-playground-region="runtime-inspector"]')).toBeTruthy()
    expect(document.querySelector('[data-playground-region="bottom-evidence-drawer"]')).toBeTruthy()

    const scrolling = document.scrollingElement
    expect(scrolling ? scrolling.scrollHeight : 0).toBeLessThanOrEqual(window.innerHeight + 1)
  } finally {
    await cleanup()
  }
})

test('166 pressure fixture routes render the stable shell regions', async () => {
  const pressureRoutes = [
    '/playground/logix-react.pressure.action-dense',
    '/playground/logix-react.pressure.state-large',
    '/playground/logix-react.pressure.trace-heavy',
    '/playground/logix-react.pressure.diagnostics-dense',
    '/playground/logix-react.pressure.scenario-driver-payload',
  ] as const

  for (const route of pressureRoutes) {
    const screen = await render(<PlaygroundHarness route={route} />)

    try {
      await expect.element(document.querySelector<HTMLElement>('[data-playground-region="top-command-bar"] button')).toBeInTheDocument()
      await expect.element(screen.getByRole('navigation', { name: 'File navigator' })).toBeInTheDocument()
      await expect.element(screen.getByLabelText('Source editor')).toBeInTheDocument()
      await expect.element(screen.getByRole('region', { name: 'Runtime inspector' })).toBeInTheDocument()
      await expect.element(screen.getByRole('region', { name: 'Workbench bottom console' })).toBeInTheDocument()
    } finally {
      await cleanup()
    }
  }
})
