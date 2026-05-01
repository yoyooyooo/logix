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

const assertDrawerLocalScroll = () => {
  const drawer = document.querySelector('[data-playground-region="bottom-evidence-drawer"]') as HTMLElement | null
  const page = document.scrollingElement

  expect(drawer).toBeTruthy()
  expect(drawer?.scrollHeight ?? 0).toBeLessThanOrEqual((drawer?.clientHeight ?? 0) + 1)
  expect(page ? page.scrollHeight : 0).toBeLessThanOrEqual(window.innerHeight + 1)
}

test('bottom Diagnostics and Trace lanes keep overflow inside the drawer', async () => {
  const screen = await render(<PlaygroundHarness route="/playground/logix-react.pressure.diagnostics-dense" />)

  try {
    await expect.element(screen.getByRole('region', { name: 'Diagnostics detail' })).toBeInTheDocument()
    assertDrawerLocalScroll()
  } finally {
    await cleanup()
  }

  const traceScreen = await render(<PlaygroundHarness route="/playground/logix-react.pressure.trace-heavy" />)
  try {
    await expect.element(traceScreen.getByLabelText('Trace detail')).toBeInTheDocument()
    assertDrawerLocalScroll()
  } finally {
    await cleanup()
  }
})
