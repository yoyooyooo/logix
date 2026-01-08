// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, afterEach } from 'vitest'
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react'
import { Effect, Schema, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useSelector, useDispatch } from '@logixjs/react'
import { LogixDevtools } from '../../src/LogixDevtools.js'
import { devtoolsLayer } from '../../src/DevtoolsLayer.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'

// Add a `matchMedia` polyfill for jsdom to avoid DevtoolsShell theme detection errors.
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

const CounterModule = Logix.Module.make('OverviewStripCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const CounterImpl = CounterModule.implement({
  initial: { count: 0 },
})

const runtime = Logix.Runtime.make(CounterImpl, {
  label: 'OverviewRuntime',
  layer: devtoolsLayer as Layer.Layer<any, never, never>,
})

const CounterView: React.FC = () => {
  const runtimeHandle = useModule(CounterImpl.tag)
  const count = useSelector(runtimeHandle, (s) => s.count)
  const dispatch = useDispatch(runtimeHandle)

  return (
    <button type="button" onClick={() => dispatch({ _tag: 'increment', payload: undefined })}>
      count: {count}
    </button>
  )
}

afterEach(() => {
  cleanup()
  Logix.Debug.clearDevtoolsEvents()
})

describe('@logixjs/devtools-react · OverviewStrip', () => {
  it('aggregates events into buckets and drives timeline range when clicking a bucket', async () => {
    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement

    // Trigger multiple increments to produce a few transactions and render events.
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    // Wait for DevtoolsState to have events and for the Overview section to render.
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
      // Ensure the Overview title exists (use stricter text matching to avoid hitting the runtime name).
      const titles = screen.getAllByText(/^Overview$/i)
      expect(titles.length).toBeGreaterThan(0)
    })

    const before = devtoolsRuntime.runSync(
      devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
    ) as DevtoolsState
    expect(before.timelineRange).toBeUndefined()

    // Click a bucket in the Overview; expect timelineRange to be set.
    const bucketButtons = screen.getAllByLabelText('OverviewBucket')
    // Pick a non-empty bucket as the target (empty buckets are disabled).
    const targetBucket = bucketButtons.find((b) => !(b as HTMLButtonElement).disabled) ?? bucketButtons[0]
    fireEvent.click(targetBucket)

    await waitFor(() => {
      const after = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(after.timelineRange).toBeDefined()
    })
  })

  it('shows last operation summary and can be dismissed', async () => {
    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement
    fireEvent.click(counterButton)

    await screen.findAllByText(/Last Operation/i)
    const close = screen.getAllByLabelText('CloseOperationSummary')[0]
    fireEvent.click(close)

    await waitFor(() => {
      expect(screen.queryAllByText(/Last Operation/i)).toHaveLength(0)
    })
  })

  it('does not crash when clearing events (hook order stays stable)', async () => {
    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const counterButton = screen.getAllByText(/count:/i)[0] as HTMLButtonElement
    fireEvent.click(counterButton)
    fireEvent.click(counterButton)

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
    })

    const clearButtons = screen.getAllByText('Clear')
    fireEvent.click(clearButtons[0] as HTMLButtonElement)

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeline.length).toBe(0)
      expect(screen.getAllByText('Overview: no events yet').length).toBeGreaterThan(0)
    })
  })
})
