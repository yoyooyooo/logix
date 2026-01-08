// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, fireEvent, waitFor, screen } from '@testing-library/react'
import { Effect, Schema, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider, useModule, useDispatch, useSelector } from '@logixjs/react'
import { LogixDevtools } from '../../src/LogixDevtools.js'
import { devtoolsLayer } from '../../src/DevtoolsLayer.js'
import { devtoolsRuntime, devtoolsModuleRuntime, type DevtoolsState } from '../../src/internal/state/index.js'

// Add a `matchMedia` polyfill for jsdom to avoid DevtoolsShell theme detection errors.
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).matchMedia = function matchMedia(query: string) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }
  }
}

const CounterModule = Logix.Module.make('TimeTravelCounter', {
  state: Schema.Struct({ value: Schema.Number, isEven: Schema.Boolean }),
  actions: {
    set: Schema.Number,
  },
  reducers: {
    set: (state, action) => ({
      ...state,
      value: (action as any).payload as number,
    }),
  },
  traits: Logix.StateTrait.from(Schema.Struct({ value: Schema.Number, isEven: Schema.Boolean }))({
    // Intentionally create a deps mismatch: reads `value` but declares no deps.
    isEven: {
      fieldPath: 'isEven',
      kind: 'computed',
      meta: {
        deps: [],
        derive: (state: any) => state.value % 2 === 0,
      },
    } as any,
  }),
})

const CounterImpl = CounterModule.implement({
  initial: { value: 0, isEven: true },
})

const runtime = Logix.Runtime.make(CounterImpl, {
  label: 'TimeTravelRuntime',
  layer: devtoolsLayer as Layer.Layer<any, never, never>,
})

const CounterView: React.FC = () => {
  const runtimeHandle = useModule(CounterImpl.tag)
  const value = useSelector(runtimeHandle, (s) => s.value)
  const dispatch = useDispatch(runtimeHandle)

  return (
    <div>
      <button type="button" onClick={() => dispatch({ _tag: 'set', payload: 1 })}>
        set-1
      </button>
      <button type="button" onClick={() => dispatch({ _tag: 'set', payload: 2 })}>
        set-2
      </button>
      <span data-testid="value">value: {value}</span>
    </div>
  )
}

describe('@logixjs/devtools-react · TimeTravel UI', () => {
  it('applies time-travel before/after and marks DevtoolsState.timeTravel, then returns to latest state', async () => {
    render(
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <CounterView />
        <LogixDevtools position="bottom-left" initialOpen={true} />
      </RuntimeProvider>,
    )

    const set1 = screen.getByText('set-1')
    const set2 = screen.getByText('set-2')

    // First produce two transactions: value = 1 -> value = 2
    fireEvent.click(set1)
    fireEvent.click(set2)

    // Wait until DevtoolsState has events and the runtime's latest state is value = 2.
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeline.length).toBeGreaterThan(0)
    })

    // Open the Inspector: click the module/instance in the Sidebar so Transaction Summary becomes available.
    // Sidebar structure: Runtime -> Module -> Instance.
    const runtimeLabels = await screen.findAllByText('TimeTravelRuntime')
    fireEvent.click(runtimeLabels[0]!)

    const moduleLabels = await screen.findAllByText('TimeTravelCounter')
    fireEvent.click(moduleLabels[0]!)

    // Wait for Transaction Summary to render (based on the latest transaction event).
    await screen.findByText(/Transaction Summary/i)

    // The deps mismatch warning should appear in the Inspector and be clickable to locate the field.
    await screen.findByText(/Deps Mismatch/i)
    const mismatchField = screen.getByLabelText('DepsMismatchFieldPath:isEven')
	    expect(mismatchField).not.toBeNull()
	
	    // Click "Back to state before txn"
	    const beforeButton = screen.getByText('Back to pre-transaction state')
	    fireEvent.click(beforeButton)

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeTravel).toBeDefined()
      expect(state.timeTravel?.mode).toBe('before')
	    })
	
	    // Click "Return to latest state"
	    const latestButton = screen.getByText('Back to latest state')
	    fireEvent.click(latestButton)

    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.timeTravel).toBeUndefined()
    })

    // Runtime state should return to the latest business state (value = 2).
    await waitFor(() => {
      const valueText = screen.getByTestId('value')
      expect(valueText.textContent).toContain('value: 2')
    })

    // Clicking the deps-mismatch field path should write `selectedFieldPath` (used for field-based timeline filtering).
    fireEvent.click(mismatchField)
    await waitFor(() => {
      const state = devtoolsRuntime.runSync(
        devtoolsModuleRuntime.getState as any as Effect.Effect<DevtoolsState, never, any>,
      ) as DevtoolsState
      expect(state.selectedFieldPath).toBe('isEven')
    })
  })
})
