// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { LogixDevtools } from '../../src/LogixDevtools.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'

// jsdom does not provide a stable `matchMedia` by default; add a minimal polyfill for tests
// to avoid DevtoolsShell theme detection throwing outside a browser environment.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

describe('@logix/devtools-react · toggle behavior', () => {
  it('opens the panel when clicking the floating Logix Devtools button', () => {
    render(<LogixDevtools position="bottom-left" />)

    // Initial render should show only the floating button.
    const toggleButton = screen.getByText(/Logix Devtools/i)
    expect(toggleButton).not.toBeNull()

    const before = devtoolsRuntime.runSync(devtoolsModuleRuntime.getState as any) as DevtoolsState
    expect(before.open).toBe(false)

    fireEvent.click(toggleButton)

    // State updates and subscriptions are async; poll until `open` becomes true,
    // and confirm the Devtools header appears in the DOM.
    return waitFor(() => {
      const after = devtoolsRuntime.runSync(devtoolsModuleRuntime.getState as any) as DevtoolsState
      expect(after.open).toBe(true)

      const header = screen.getByText(/Developer Tools/i)
      expect(header).not.toBeNull()
    })
  })
})
