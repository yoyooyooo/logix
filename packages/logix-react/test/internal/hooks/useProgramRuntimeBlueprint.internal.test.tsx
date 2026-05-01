import { describe, it, expect, afterEach } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { render, fireEvent, waitFor, cleanup, renderHook } from '@testing-library/react'
import { Effect, Layer, ManagedRuntime, Schema, ServiceMap } from 'effect'
import * as Logix from '@logixjs/core'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { RuntimeProvider } from '../../../src/RuntimeProvider.js'
import { useModule } from '../../../src/Hooks.js'
import { useProgramRuntimeBlueprint } from '../../../src/internal/hooks/useProgramRuntimeBlueprint.js'
import { useSelector } from '../../../src/internal/hooks/useSelector.js'

const Counter = Logix.Module.make('useProgramRuntimeBlueprintInternalCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { increment: Schema.Void, noop: Schema.Void },
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
const CounterBlueprint = RuntimeContracts.getProgramRuntimeBlueprint(CounterProgram)

describe('useProgramRuntimeBlueprint internal hook', () => {
  afterEach(() => {
    cleanup()
  })

  it('does not silently reuse the root singleton runtime', async () => {
    const runtime = ManagedRuntime.make(
      Counter.live({ count: 0 }).pipe(Layer.mergeAll) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const singleton = useModule(Counter.tag)
        const local = useProgramRuntimeBlueprint(CounterBlueprint)
        return {
          singletonId: singleton.runtime.instanceId,
          localId: local.runtime.instanceId,
          sameRuntime: singleton.runtime === local.runtime,
        }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(typeof result.current.singletonId).toBe('string')
      expect(typeof result.current.localId).toBe('string')
      expect(result.current.sameRuntime).toBe(false)
    })

    await runtime.dispose()
  })

  it('reuses the same local instance for the same key across components', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as unknown as Layer.Layer<any, never, never>)
    const EnvTag = ServiceMap.Service<{ readonly name: string }>('@logixjs/react-test/useProgramRuntimeBlueprintInternal/env')
    const EnvLayer = Layer.succeed(EnvTag, { name: 'env' })

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} layer={EnvLayer}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </RuntimeProvider>
    )

    const UseCounter = () => {
      const counter = useProgramRuntimeBlueprint(CounterBlueprint, { key: 'shared' })
      const count = useSelector(counter, (s) => (s as { count: number }).count)
      return { count, inc: counter.dispatchers.increment, id: String(counter.runtime.instanceId) }
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
      expect(getByTestId('a').textContent).toBe('1')
      expect(getByTestId('b').textContent).toBe('1')
      expect(getByTestId('id-a').textContent).toBe(getByTestId('id-b').textContent)
    })

    unmount()
    await runtime.dispose()
  })

  it('isolates instances for different keys', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as unknown as Layer.Layer<any, never, never>)

    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </RuntimeProvider>
    )

    const View = () => {
      const a = useProgramRuntimeBlueprint(CounterBlueprint, { key: 'a' })
      const b = useProgramRuntimeBlueprint(CounterBlueprint, { key: 'b' })
      const aCount = useSelector(a, (s) => (s as { count: number }).count)
      const bCount = useSelector(b, (s) => (s as { count: number }).count)
      return (
        <>
          <button type="button" onClick={() => a.dispatchers.increment()}>
            inc-a
          </button>
          <button type="button" onClick={() => b.dispatchers.increment()}>
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

  it('does not share instances across different subtree layer scopes even with the same key', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as unknown as Layer.Layer<any, never, never>)
    const EnvTag = ServiceMap.Service<{ readonly name: string }>(
      '@logixjs/react-test/useProgramRuntimeBlueprintInternal/scope-env',
    )
    const LayerA = Layer.succeed(EnvTag, { name: 'A' })
    const LayerB = Layer.succeed(EnvTag, { name: 'B' })

    const Panel = ({ testId, buttonId }: { testId: string; buttonId: string }) => {
      const counter = useProgramRuntimeBlueprint(CounterBlueprint, { key: 'shared' })
      const count = useSelector(counter, (s) => (s as { count: number }).count)
      return (
        <>
          <button type="button" data-testid={buttonId} onClick={() => counter.dispatchers.increment()}>
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
      expect(getByTestId('b').textContent).toBe('0')
      expect(getByTestId('id:a').textContent).not.toBe(getByTestId('id:b').textContent)
    })

    unmount()
    await runtime.dispose()
  })
})
