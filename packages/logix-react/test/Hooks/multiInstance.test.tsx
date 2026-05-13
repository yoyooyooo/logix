import { describe, it, expect, afterEach } from 'vitest'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
// @vitest-environment happy-dom
import React from 'react'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { Schema, ManagedRuntime, Layer, Effect } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'

const Counter = Logix.Module.make('CounterMulti', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

const CounterLogic = Counter.logic('counter-logic', ($) =>
  Effect.gen(function* () {
    yield* $.onAction('increment').run($.state.update((s) => ({ count: s.count + 1 })))
  }),
)

const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})

describe('useModule multi-instance behavior', () => {
  afterEach(() => {
    cleanup()
  })
  const makeTagRuntime = () => {
    const tickServicesLayer = RuntimeContracts.tickServicesLayer as Layer.Layer<any, never, any>
    const counterLayer = Counter.live({ count: 0 }, CounterLogic) as Layer.Layer<any, never, any>
    return ManagedRuntime.make(
      Layer.mergeAll(tickServicesLayer, Layer.provide(counterLayer, tickServicesLayer)) as Layer.Layer<any, never, never>,
    )
  }

  const makeImplRuntime = () =>
    ManagedRuntime.make(RuntimeContracts.tickServicesLayer as Layer.Layer<any, never, never>)

  it('Tag mode should share module instance across components', async () => {
    const runtime = makeTagRuntime()

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const UseCounter = () => {
      const counter = useModule(Counter.tag)
      const count = useSelector(Counter.tag, (s) => (s as { count: number }).count)
      return { count, inc: counter.dispatchers.increment }
    }

    const View = () => {
      const a = UseCounter()
      const b = UseCounter()
      return (
        <>
          <button type="button" onClick={() => a.inc()}>
            inc-a
          </button>
          <span data-testid="a">{a.count}</span>
          <span data-testid="b">{b.count}</span>
        </>
      )
    }

    const { getByTestId, getByText } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('0')
      expect(getByTestId('b').textContent).toBe('0')
    })

    fireEvent.click(getByText('inc-a'))

    await waitFor(() => {
      // In Tag mode, using the same Module in two places should observe the same value.
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('1')
    })

    await runtime.dispose()
  })

  it('Program runtime blueprint mode should isolate state per component', async () => {
    const runtime = makeImplRuntime()

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const UseLocalCounter = () => {
      const counter = useModule(CounterProgram)
      const count = useSelector(counter, (s) => (s as { count: number }).count)
      return { count, inc: counter.dispatchers.increment }
    }

    const View = () => {
      const a = UseLocalCounter()
      const b = UseLocalCounter()
      return (
        <>
          <button type="button" onClick={() => a.inc()}>
            inc-a
          </button>
          <button type="button" onClick={() => b.inc()}>
            inc-b
          </button>
          <span data-testid="a">{a.count}</span>
          <span data-testid="b">{b.count}</span>
        </>
      )
    }

    const { getByTestId, getByText } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('0')
      expect(getByTestId('b').textContent).toBe('0')
    })

    // Click A only; expect B to be unaffected.
    fireEvent.click(getByText('inc-a'))

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('0')
    })

    // Then click B; expect the two instances to maintain independent state.
    fireEvent.click(getByText('inc-b'))

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('1')
    })

    await runtime.dispose()
  })

  it('Program runtime blueprint mode should isolate state per component under default suspend policy', async () => {
    const runtime = makeImplRuntime()

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </RuntimeProvider>
    )

    const UseLocalCounter = () => {
      const counter = useModule(CounterProgram)
      const count = useSelector(counter, (s) => (s as { count: number }).count)
      return { count, inc: counter.dispatchers.increment, instanceId: counter.runtime.instanceId }
    }

    const Panel = ({ slot }: { slot: 'a' | 'b' }) => {
      const counter = UseLocalCounter()
      return (
        <>
          <button type="button" onClick={() => counter.inc()}>
            inc-{slot}
          </button>
          <span data-testid={slot}>{counter.count}</span>
          <span data-testid={`id:${slot}`}>{counter.instanceId}</span>
        </>
      )
    }

    const View = () => (
      <>
        <Panel slot="a" />
        <Panel slot="b" />
      </>
    )

    const { getByTestId, getByText } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('0')
      expect(getByTestId('b').textContent).toBe('0')
      expect(getByTestId('id:a').textContent).not.toBe(getByTestId('id:b').textContent)
    })

    fireEvent.click(getByText('inc-a'))

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('0')
      expect(getByTestId('id:a').textContent).not.toBe(getByTestId('id:b').textContent)
    })

    fireEvent.click(getByText('inc-b'))

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('1')
      expect(getByTestId('id:a').textContent).not.toBe(getByTestId('id:b').textContent)
    })

    await runtime.dispose()
  })
})
