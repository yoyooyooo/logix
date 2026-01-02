import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React, { Suspense } from 'react'
import { render, screen, waitFor, fireEvent, renderHook } from '@testing-library/react'
import { Schema, Effect, Layer, ManagedRuntime } from 'effect'
import * as Logix from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('StrictAsyncCounter', {
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

const AsyncCounterImpl = Counter.implement({
  initial: { value: 0 },
  logics: [
    Effect.gen(function* () {
      // Simulate async initialization to ensure the Suspense path is exercised.
      yield* Effect.sleep('10 millis')
      // After the delay, attach the existing CounterLogic (do not run the Logic here).
      return CounterLogic as any
    }),
  ] as any,
})

interface SharedCounterViewProps {
  /** Resource-cache key that determines whether ModuleRuntime is shared */
  readonly resourceKey: string
  /** Test id prefix used to distinguish view instances */
  readonly viewId: string
}

const SharedCounterView: React.FC<SharedCounterViewProps> = ({ resourceKey, viewId }) => {
  const counter = useModule(AsyncCounterImpl, {
    suspend: true,
    key: resourceKey,
  })
  const value = useModule(counter, (s) => (s as { value: number }).value)

  return (
    <div>
      <span data-testid={`value-${viewId}`}>{value}</span>
      <button type="button" data-testid={`inc-${viewId}`} onClick={() => counter.actions.inc()}>
        inc
      </button>
    </div>
  )
}

describe('StrictMode + Suspense integration for ModuleImpl', () => {
  it('should share ModuleRuntime between components with same suspend:true key under StrictMode + Suspense', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    render(
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          <Suspense fallback={<div data-testid="fallback">loading</div>}>
            <div>
              <SharedCounterView resourceKey="StrictShared:A" viewId="A" />
              <SharedCounterView resourceKey="StrictShared:A" viewId="A-mirror" />
            </div>
          </Suspense>
        </RuntimeProvider>
      </React.StrictMode>,
    )

    // Initially it should show the Suspense fallback.
    expect(screen.getByTestId('fallback')).toBeTruthy()

    // Wait for async init to complete; both views should render 0.
    await waitFor(() => {
      expect(screen.queryByTestId('fallback')).toBeNull()
      expect(screen.getByTestId('value-A').textContent).toBe('0')
      expect(screen.getByTestId('value-A-mirror').textContent).toBe('0')
    })

    // Click one instance button; both views should become 1 (share the same ModuleRuntime).
    fireEvent.click(screen.getByTestId('inc-A'))

    await waitFor(() => {
      expect(screen.getByTestId('value-A').textContent).toBe('1')
      expect(screen.getByTestId('value-A-mirror').textContent).toBe('1')
    })
  })

  it('should create distinct ModuleRuntime instances for different suspend:true keys under StrictMode + Suspense', async () => {
    const runtime = ManagedRuntime.make(Layer.empty as Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          <Suspense fallback={null}>{children}</Suspense>
        </RuntimeProvider>
      </React.StrictMode>
    )

    const usePair = () => {
      const left = useModule(AsyncCounterImpl, {
        suspend: true,
        key: 'StrictShared:Left',
      })
      const right = useModule(AsyncCounterImpl, {
        suspend: true,
        key: 'StrictShared:Right',
      })
      return { leftId: left.runtime.instanceId, rightId: right.runtime.instanceId }
    }

    const { result } = renderHook(() => usePair(), { wrapper })

    await waitFor(() => {
      expect(result.current.leftId).toBeDefined()
      expect(result.current.rightId).toBeDefined()
      expect(result.current.leftId).not.toBe(result.current.rightId)
    })
  })
})
