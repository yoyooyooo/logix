import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Schema, Effect } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'
import { fieldValue } from '../../src/FormProjection.js'
import React from 'react'

const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

describe('useSelector', () => {
  it('should select state slice and update on change', async () => {
    const CounterLogic = Counter.logic<never>('counter-logic', (api) =>
      Effect.gen(function* () {
        yield* api.onAction('increment').run(() => api.state.update((s) => ({ count: s.count + 1 })))
      }),
    )

    const runtime = Logix.Runtime.make(
      Logix.Program.make(Counter, {
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
      const countFromField = useSelector(counter, fieldValue('count'))
      const count = useSelector(counter, (s: Logix.Module.StateOf<typeof Counter.shape>) => s.count)
      return { counter, countFromField, count }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.countFromField).toBe(10)
      expect(result.current.count).toBe(10)
    })

    await act(async () => {
      result.current.counter.dispatchers.increment()
    })

    await waitFor(() => {
      expect(result.current.countFromField).toBe(11)
      expect(result.current.count).toBe(11)
    })
  })

  it('should invoke equalityFn when provided', async () => {
    const CounterLogic = Counter.logic<never>('counter-logic-2', (api) =>
      Effect.gen(function* () {
        yield* api.onAction('increment').run(() => api.state.update((s) => ({ count: s.count + 1 })))
      }),
    )

    const runtime = Logix.Runtime.make(
      Logix.Program.make(Counter, {
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
      const count = useSelector(
        counter,
        (s: Logix.Module.StateOf<typeof Counter.shape>) => s.count,
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
