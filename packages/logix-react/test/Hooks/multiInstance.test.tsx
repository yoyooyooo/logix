import { describe, it, expect, afterEach } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { Schema, ManagedRuntime, Layer, Effect } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('CounterMulti', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
  },
})

const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('increment').run($.state.update((s) => ({ count: s.count + 1 })))
  }),
)

const CounterImpl = Counter.implement({
  initial: { count: 0 },
  logics: [CounterLogic],
})

describe('useModule multi-instance behavior', () => {
  afterEach(() => {
    cleanup()
  })
  const makeTagRuntime = () =>
    ManagedRuntime.make(Counter.live({ count: 0 }, CounterLogic) as Layer.Layer<any, never, never>)

  const makeImplRuntime = () => ManagedRuntime.make(Layer.empty as unknown as Layer.Layer<any, never, never>)

  it('Tag mode should share module instance across components', async () => {
    const runtime = makeTagRuntime()

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const UseCounter = () => {
      const counter = useModule(Counter.tag)
      const count = useModule(Counter.tag, (s) => (s as { count: number }).count)
      return { count, inc: counter.actions.increment }
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
      // Tag 模式下，两处使用同一 Module，都看到同一个值
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('1')
    })

    await runtime.dispose()
  })

  it('ModuleImpl mode should isolate state per component', async () => {
    const runtime = makeImplRuntime()

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const UseLocalCounter = () => {
      const counter = useModule(CounterImpl)
      const count = useModule(counter, (s) => (s as { count: number }).count)
      return { count, inc: counter.actions.increment }
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

    // 只点 A，期待 B 不受影响
    fireEvent.click(getByText('inc-a'))

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('0')
    })

    // 再点 B，期待两个实例各自维护状态
    fireEvent.click(getByText('inc-b'))

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('1')
    })

    await runtime.dispose()
  })
})
