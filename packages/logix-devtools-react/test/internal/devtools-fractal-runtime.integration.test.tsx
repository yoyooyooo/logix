// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, waitFor, screen, fireEvent } from '@testing-library/react'
import { FractalRuntimeLayout } from '../../../../examples/logix-react/src/demos/FractalRuntimeLayout.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'
import { getDevtoolsSnapshot, clearDevtoolsEvents } from '../../src/DevtoolsLayer.js'

describe('@logix/devtools-react · FractalRuntimeLayout integration', () => {
  it('collects events and exposes FractalRuntimeDemo runtime in Devtools', async () => {
    // Ensure the test starts from a clean window.
    clearDevtoolsEvents()

    render(<FractalRuntimeLayout />)

    // RuntimeProvider defaults to `suspend` (with gating); wait for the subtree to mount before the button is available.
    await screen.findAllByText('+1')

    // After refresh (no user interaction), we should still see an active Runtime / Module:
    // - ModuleRuntime.make emits an initial state:update right after module:init;
    // - DevtoolsSnapshot.latestStates / instances should include FractalRuntimeDemo / CounterModule.
    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()
      expect(snapshot.instances.size).toBeGreaterThan(0)
      expect(
        Array.from(snapshot.instances.keys()).some((key) => key.startsWith('FractalRuntimeDemo::CounterModule')),
      ).toBe(true)
    })

    // Trigger one +1 to ensure at least one state:update and module:init are recorded.
    const incrementButtons = screen.getAllByText('+1')
    fireEvent.click(incrementButtons[0]!)

    await waitFor(() => {
      const snapshot = getDevtoolsSnapshot()

      expect(snapshot.events.length).toBeGreaterThan(0)
    })

    // DevtoolsState should include the FractalRuntimeDemo runtime and it should contain CounterModule.
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(devtoolsModuleRuntime.getState as any) as DevtoolsState

      expect(
        state.runtimes.some((r: DevtoolsState['runtimes'][number]) => r.runtimeLabel === 'FractalRuntimeDemo'),
      ).toBe(true)

      const fractalRuntime = state.runtimes.find(
        (r: DevtoolsState['runtimes'][number]) => r.runtimeLabel === 'FractalRuntimeDemo',
      )

      expect(
        fractalRuntime?.modules.some(
          (m: DevtoolsState['runtimes'][number]['modules'][number]) => m.moduleId === 'CounterModule',
        ),
      ).toBe(true)
    })
  })
})
