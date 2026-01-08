import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import { renderHook, act, waitFor } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Effect, Schema, ManagedRuntime } from 'effect'
import { useModule } from '../../src/Hooks.js'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import React from 'react'

const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

describe('useDispatch', () => {
  it('should dispatch actions and update state', async () => {
    const CounterLogic = Counter.logic<never>((api) =>
      Effect.gen(function* () {
        // Mount watchers in the run phase to avoid triggering the Phase Guard during setup.
        yield* api.onAction('increment').run(() => api.state.update((s) => ({ count: s.count + 1 })))
      }),
    )

    const layer = Counter.live({ count: 0 }, CounterLogic)
    // In tests, the Layer dependencies are already closed in Counter.live; use a type assertion to close RIn.
    const runtime = ManagedRuntime.make(layer as import('effect').Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const useTest = () => {
      const counter = useModule(Counter.tag)
      const count = useModule(Counter.tag, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
      return { counter, count }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    await act(async () => {
      result.current.counter.dispatchers.increment()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })
})
