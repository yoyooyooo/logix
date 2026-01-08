import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Schema, Effect } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'
import React from 'react'

const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

describe('useSelector', () => {
  it('should select state slice and update on change', async () => {
    const CounterLogic = Counter.logic<never>((api) =>
      Effect.gen(function* () {
        yield* api.onAction('increment').run(() => api.state.update((s) => ({ count: s.count + 1 })))
      }),
    )

    const runtime = Logix.Runtime.make(
      Counter.implement({
        initial: { count: 10 },
        logics: [CounterLogic],
      }),
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    // Helper hook to trigger update
    const useTest = () => {
      const counter = useModule(Counter.tag)
      const count = useModule(Counter.tag, (s: Logix.StateOf<typeof Counter.shape>) => s.count)
      return { counter, count }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(10)
    })

    await act(async () => {
      result.current.counter.dispatchers.increment()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(11)
    })
  })

  it('should invoke equalityFn when provided', async () => {
    const CounterLogic = Counter.logic<never>((api) =>
      Effect.gen(function* () {
        yield* api.onAction('increment').run(() => api.state.update((s) => ({ count: s.count + 1 })))
      }),
    )

    const runtime = Logix.Runtime.make(
      Counter.implement({
        initial: { count: 0 },
        logics: [CounterLogic],
      }),
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    let equalityCallCount = 0

    const useTest = () => {
      const counter = useModule(Counter.tag)
      const count = useModule(
        Counter.tag,
        (s: Logix.StateOf<typeof Counter.shape>) => s.count,
        (prev, next) => {
          equalityCallCount++
          return Object.is(prev, next)
        },
      )
      return { counter, count }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.count).toBe(0)
    })

    const beforeCalls = equalityCallCount

    await act(async () => {
      result.current.counter.dispatchers.increment()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })

    // A custom equalityFn should be called at least once during an update cycle.
    expect(equalityCallCount).toBeGreaterThan(beforeCalls)
  })
})
