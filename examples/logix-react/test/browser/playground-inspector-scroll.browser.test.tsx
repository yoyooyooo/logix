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

const scrollInfo = (selector: string) => {
  const element = document.querySelector(selector) as HTMLElement | null
  expect(element).toBeTruthy()
  return {
    scrollHeight: element?.scrollHeight ?? 0,
    clientHeight: element?.clientHeight ?? 0,
    overflowY: element ? getComputedStyle(element).overflowY : '',
  }
}

test('RuntimeInspector action and state sections own local scroll under pressure', async () => {
  const screen = await render(<PlaygroundHarness route="/playground/logix-react.pressure.action-dense" />)

  try {
    await expect.element(screen.getByRole('region', { name: 'Action workbench' })).toBeInTheDocument()
    const actions = scrollInfo('[data-playground-section="actions-list"]')
    const page = document.scrollingElement

    expect(actions.overflowY).toMatch(/auto|scroll/)
    expect(actions.scrollHeight).toBeGreaterThanOrEqual(actions.clientHeight)
    expect(page ? page.scrollHeight : 0).toBeLessThanOrEqual(window.innerHeight + 1)
  } finally {
    await cleanup()
  }

  const stateScreen = await render(<PlaygroundHarness route="/playground/logix-react.pressure.state-large" />)
  try {
    await expect.element(stateScreen.getByRole('region', { name: 'State' })).toBeInTheDocument()
    const state = scrollInfo('[data-playground-section="state"]')
    const page = document.scrollingElement

    expect(state.overflowY).toMatch(/auto|scroll/)
    expect(state.scrollHeight).toBeGreaterThanOrEqual(state.clientHeight)
    expect(page ? page.scrollHeight : 0).toBeLessThanOrEqual(window.innerHeight + 1)
  } finally {
    await cleanup()
  }
})
