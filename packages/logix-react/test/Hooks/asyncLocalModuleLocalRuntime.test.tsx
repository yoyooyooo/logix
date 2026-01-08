import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React, { Suspense } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

// Reproduce the core logic from examples/logix-react/src/demos/AsyncLocalModuleLayout.tsx
// to verify suspend:true + local ModuleImpl behavior under tests.

const AsyncCounterModule = Logix.Module.make('AsyncLocalCounter:test', {
  state: Schema.Struct({ count: Schema.Number, ready: Schema.Boolean }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const AsyncCounterLogic = AsyncCounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* Effect.sleep('10 millis')

    yield* $.state.update((s) => ({
      ...s,
      ready: true,
    }))

    yield* $.onAction('increment').runParallelFork(
      $.state.mutate((s) => {
        s.count += 1
      }),
    )

    yield* $.onAction('decrement').runParallelFork(
      $.state.mutate((s) => {
        s.count -= 1
      }),
    )
  }),
)

const AsyncCounterImpl = AsyncCounterModule.implement({
  initial: { count: 0, ready: false },
  logics: [AsyncCounterLogic],
})

const asyncLocalRuntime = ManagedRuntime.make(
  Layer.empty as Layer.Layer<never, never, never>,
) as unknown as ManagedRuntime.ManagedRuntime<any, any>

const AsyncLocalCounterView: React.FC = () => {
  const counter = useModule(AsyncCounterImpl, {
    suspend: true,
    key: 'AsyncLocalCounter:test-instance',
  })
  const state = useModule(counter, (s) => s as { count: number; ready: boolean })

  if (!state.ready) {
    return <div>Initializing…</div>
  }

  return (
    <div>
      <span data-testid="value">{state.count}</span>
      <button type="button" onClick={() => counter.dispatchers.increment()}>
        inc
      </button>
    </div>
  )
}

describe('AsyncLocalModule with suspend:true and local runtime', () => {
  it('should resolve Suspense and render counter after async init', async () => {
    render(
      <RuntimeProvider runtime={asyncLocalRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <Suspense fallback={<div data-testid="fallback">fallback</div>}>
          <AsyncLocalCounterView />
        </Suspense>
      </RuntimeProvider>,
    )

    // Initially it should show the Suspense fallback.
    expect(screen.getByTestId('fallback')).toBeTruthy()

    // Wait for async initialization to complete and render the real view.
    await waitFor(() => {
      expect(screen.queryByTestId('fallback')).toBeNull()
      expect(screen.getByTestId('value').textContent).toBe('0')
    })
  })
})
