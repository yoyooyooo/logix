import { describe, it, expect, afterEach } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { Schema, ManagedRuntime, Layer, Effect, Context } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('useModuleImplKeyedCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { increment: Schema.Void },
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

describe('useModule(ModuleImpl, { key })', () => {
  afterEach(() => {
    cleanup()
  })

  const makeRuntime = () => ManagedRuntime.make(Layer.empty as unknown as Layer.Layer<any, never, never>)

  it('reuses the same local instance for the same key across components', async () => {
    const runtime = makeRuntime()
    const EnvTag = Context.GenericTag<{ readonly name: string }>('@logix/react-test/useModuleImplKeyed/env')
    const EnvLayer = Layer.succeed(EnvTag, { name: 'env' })

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} layer={EnvLayer}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </RuntimeProvider>
    )

    const UseCounter = () => {
      const counter = useModule(CounterImpl, { key: 'shared' })
      const count = useModule(counter, (s) => (s as { count: number }).count)
      return { count, inc: counter.actions.increment, id: String(counter.runtime.instanceId) }
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
          <span data-testid="id-a">{a.id}</span>
          <span data-testid="id-b">{b.id}</span>
        </>
      )
    }

    const { getByTestId, getByText, unmount } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('0')
      expect(getByTestId('b').textContent).toBe('0')
      expect(getByTestId('id-a').textContent).toBe(getByTestId('id-b').textContent)
    })

    fireEvent.click(getByText('inc-a'))

    await waitFor(() => {
      // 同 key：两处看到同一个值
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('1')
      expect(getByTestId('id-a').textContent).toBe(getByTestId('id-b').textContent)
    })

    unmount()
    await runtime.dispose()
  })

  it('isolates instances for different keys', async () => {
    const runtime = makeRuntime()

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </RuntimeProvider>
    )

    const View = () => {
      const a = useModule(CounterImpl, { key: 'a' })
      const b = useModule(CounterImpl, { key: 'b' })
      const aCount = useModule(a, (s) => (s as { count: number }).count)
      const bCount = useModule(b, (s) => (s as { count: number }).count)
      return (
        <>
          <button type="button" onClick={() => a.actions.increment()}>
            inc-a
          </button>
          <button type="button" onClick={() => b.actions.increment()}>
            inc-b
          </button>
          <span data-testid="a">{aCount}</span>
          <span data-testid="b">{bCount}</span>
        </>
      )
    }

    const { getByTestId, getByText, unmount } = render(<View />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('0')
      expect(getByTestId('b').textContent).toBe('0')
    })

    fireEvent.click(getByText('inc-a'))

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('0')
    })

    fireEvent.click(getByText('inc-b'))

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('1')
    })

    unmount()
    await runtime.dispose()
  })

  it('does not share instances across different RuntimeProvider.layer scopes even with the same key', async () => {
    const runtime = makeRuntime()
    const EnvTag = Context.GenericTag<{ readonly name: string }>('@logix/react-test/useModuleImplKeyed/scope-env')
    const LayerA = Layer.succeed(EnvTag, { name: 'A' })
    const LayerB = Layer.succeed(EnvTag, { name: 'B' })

    const Panel = ({ testId, buttonId }: { testId: string; buttonId: string }) => {
      const counter = useModule(CounterImpl, { key: 'shared' })
      const count = useModule(counter, (s) => (s as { count: number }).count)
      return (
        <>
          <button type="button" data-testid={buttonId} onClick={() => counter.actions.increment()}>
            inc
          </button>
          <span data-testid={testId}>{count}</span>
          <span data-testid={`id:${testId}`}>{String(counter.runtime.instanceId)}</span>
        </>
      )
    }

    const View = () => {
      return (
        <>
          <RuntimeProvider runtime={runtime} layer={LayerA}>
            <React.Suspense fallback={null}>
              <Panel testId="a" buttonId="inc-a" />
            </React.Suspense>
          </RuntimeProvider>
          <RuntimeProvider runtime={runtime} layer={LayerB}>
            <React.Suspense fallback={null}>
              <Panel testId="b" buttonId="inc-b" />
            </React.Suspense>
          </RuntimeProvider>
        </>
      )
    }

    const { getByTestId, unmount } = render(<View />)

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('0')
      expect(getByTestId('b').textContent).toBe('0')
      expect(getByTestId('id:a').textContent).not.toBe(getByTestId('id:b').textContent)
    })

    fireEvent.click(getByTestId('inc-a'))

    await waitFor(() => {
      expect(getByTestId('a').textContent).toBe('1')
      // 不同 Provider.layer scope：即便 key 相同，也不应串实例
      expect(getByTestId('b').textContent).toBe('0')
      expect(getByTestId('id:a').textContent).not.toBe(getByTestId('id:b').textContent)
    })

    unmount()
    await runtime.dispose()
  })
})
