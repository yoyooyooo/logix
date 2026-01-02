import { describe, it, expect, vi } from 'vitest'
// @vitest-environment happy-dom
import React, { Suspense } from 'react'
import { render, fireEvent, renderHook, waitFor } from '@testing-library/react'
import { Schema, Effect, Layer, ManagedRuntime, Context } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('SuspendCounter', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
})

const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').run($.state.update((s) => ({ ...s, value: s.value + 1 })))
  }),
)

// Simulate an "async-built" ModuleImpl (use Effect.sleep as a stand-in for real IO).
const AsyncCounterImpl = Counter.implement({
  initial: { value: 0 },
  logics: [
    Effect.gen(function* () {
      // Simulate async initialization logic.
      yield* Effect.sleep('10 millis')
      // After the delay, attach the existing CounterLogic (we only need to return the Logic itself; do not run it here).
      return CounterLogic as any
    }),
  ] as any,
})

describe('useModule(Impl) suspend mode', () => {
  it('should reuse same key across hook calls even when RuntimeProvider.layer is present', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const EnvTag = Context.GenericTag<{ readonly name: string }>('@logix/react-test/useModuleSuspend/env')
    const EnvLayer = Layer.succeed(EnvTag, { name: 'env' })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} layer={EnvLayer}>
          <Suspense fallback={null}>{children}</Suspense>
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const a = useModule(AsyncCounterImpl, {
        suspend: true,
        key: 'AsyncCounter:shared',
      })
      const b = useModule(AsyncCounterImpl, {
        suspend: true,
        key: 'AsyncCounter:shared',
      })
      const aValue = useModule(a, (s) => (s as { value: number }).value)
      const bValue = useModule(b, (s) => (s as { value: number }).value)
      return { a, b, aValue, bValue }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.aValue).toBe(0)
      expect(result.current.bValue).toBe(0)
      expect(result.current.a.runtime.instanceId).toBe(result.current.b.runtime.instanceId)
    })

    result.current.a.actions.inc()

    await waitFor(() => {
      expect(result.current.aValue).toBe(1)
      expect(result.current.bValue).toBe(1)
    })

    await runtime.dispose()
  })

  it('should isolate instances for different keys even when RuntimeProvider.layer is present', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const EnvTag = Context.GenericTag<{ readonly name: string }>('@logix/react-test/useModuleSuspend/env-keys')
    const EnvLayer = Layer.succeed(EnvTag, { name: 'env' })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} layer={EnvLayer}>
          <Suspense fallback={null}>{children}</Suspense>
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const a = useModule(AsyncCounterImpl, {
        suspend: true,
        key: 'AsyncCounter:a',
      })
      const b = useModule(AsyncCounterImpl, {
        suspend: true,
        key: 'AsyncCounter:b',
      })
      const aValue = useModule(a, (s) => (s as { value: number }).value)
      const bValue = useModule(b, (s) => (s as { value: number }).value)
      return { a, b, aValue, bValue }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.aValue).toBe(0)
      expect(result.current.bValue).toBe(0)
      expect(result.current.a.runtime.instanceId).not.toBe(result.current.b.runtime.instanceId)
    })

    result.current.a.actions.inc()

    await waitFor(() => {
      expect(result.current.aValue).toBe(1)
      expect(result.current.bValue).toBe(0)
    })

    await runtime.dispose()
  })

  it('should not share instances across different RuntimeProvider.layer scopes even with the same key', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)
    const EnvTag = Context.GenericTag<{ readonly name: string }>('@logix/react-test/useModuleSuspend/scope-env')
    const LayerA = Layer.succeed(EnvTag, { name: 'A' })
    const LayerB = Layer.succeed(EnvTag, { name: 'B' })

    const Panel = ({ testId, buttonId }: { testId: string; buttonId: string }) => {
      const counter = useModule(AsyncCounterImpl, {
        suspend: true,
        key: 'AsyncCounter:shared',
      })
      const value = useModule(counter, (s) => (s as { value: number }).value)
      return (
        <>
          <button type="button" data-testid={buttonId} onClick={() => counter.actions.inc()}>
            inc
          </button>
          <span data-testid={testId}>{value}</span>
          <span data-testid={`id:${testId}`}>{String(counter.runtime.instanceId)}</span>
        </>
      )
    }

    const View = () => {
      return (
        <>
          <RuntimeProvider runtime={runtime} layer={LayerA}>
            <Suspense fallback={null}>
              <Panel testId="a" buttonId="inc-a" />
            </Suspense>
          </RuntimeProvider>
          <RuntimeProvider runtime={runtime} layer={LayerB}>
            <Suspense fallback={null}>
              <Panel testId="b" buttonId="inc-b" />
            </Suspense>
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
      expect(getByTestId('b').textContent).toBe('0')
      expect(getByTestId('id:a').textContent).not.toBe(getByTestId('id:b').textContent)
    })

    unmount()
    await runtime.dispose()
  })

  it('should support suspend:true with explicit key (baseline)', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          <Suspense fallback={null}>{children}</Suspense>
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const counter = useModule(AsyncCounterImpl, {
        suspend: true,
        key: 'AsyncCounter:test',
      })
      const value = useModule(counter, (s) => (s as { value: number }).value)
      return { counter, value }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })

    result.current?.counter.actions.inc()

    await waitFor(() => {
      expect(result.current?.value).toBe(1)
    })

    await runtime.dispose()
  })

  it('should throw helpful error when suspend:true is used without key in dev', async () => {
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'test'

    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          <Suspense fallback={null}>{children}</Suspense>
        </RuntimeProvider>
      </React.StrictMode>
    )

    try {
      const useTest = () => {
        // Intentionally omit `key` to verify useModule throws a readable error in dev/test,
        // preventing callers from using suspend:true without an explicit resource identity.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error suspend:true requires an explicit key
        useModule(AsyncCounterImpl, {
          suspend: true,
        })
        return null
      }

      expect(() => renderHook(() => useTest(), { wrapper })).toThrowError(/suspend:true 模式必须显式提供 options\.key/)
    } finally {
      if (prevEnv === undefined) {
        delete process.env.NODE_ENV
      } else {
        process.env.NODE_ENV = prevEnv
      }
      await runtime.dispose()
    }
  })
})
