import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import { renderHook, act, waitFor } from '@testing-library/react'
import * as Logix from '@logix/core'
import { Schema, Effect, ManagedRuntime, Layer } from 'effect'
import { useModule } from '../../src/Hooks.js'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import React from 'react'

// Define a simple Counter module
const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})

const makeRuntime = (layer: Layer.Layer<any, any, any>) => {
  const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, never>
  const runtimeLayer = Layer.mergeAll(tickServicesLayer, Layer.provide(layer, tickServicesLayer)) as Layer.Layer<any, any, never>
  return ManagedRuntime.make(runtimeLayer)
}

describe('useModule', () => {
  it('should retrieve module from RuntimeProvider and update state', async () => {
    // Create a runtime with the Counter module
    const layer = Counter.live(
      { count: 0 },
      Counter.logic<never>((api) =>
        Effect.gen(function* () {
          yield* api.onAction('increment').run(() => api.state.update((s) => ({ count: s.count + 1 })))
        }),
      ),
    )
    const runtime = makeRuntime(layer)

    // Wrapper component to provide runtime
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const counter = useModule(Counter)
        const count = useModule(Counter, (s) => s.count)
        return { counter, count }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.count).toBe(0)
      expect(typeof result.current.counter.runtime.dispatch).toBe('function')
    })

    await act(async () => {
      result.current.counter.dispatchers.increment()
    })

    await waitFor(() => {
      expect(result.current.count).toBe(1)
    })
  })

  it('should preserve StateTransaction instrumentation between Runtime.run* and RuntimeProvider + useModule', async () => {
    const InstrCounter = Logix.Module.make('InstrCounter', {
      state: Schema.Struct({ value: Schema.Number }),
      actions: { inc: Schema.Void },
    })

    const InstrCounterImpl = InstrCounter.implement({
      initial: { value: 0 },
      logics: [],
    })

    // Runtime-level config: instrumentation = "light"
    const runtime = Logix.Runtime.make(InstrCounterImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
      stateTransaction: { instrumentation: 'light' },
    })

    // Read the internal instrumentation flag by accessing ModuleRuntime via Runtime.runPromise directly.
    const directInstr = await runtime.runPromise(
      Effect.gen(function* () {
        const rt = yield* InstrCounter.tag
        return Logix.InternalContracts.getStateTransactionInstrumentation(rt as any)
      }) as Effect.Effect<string, never, any>,
    )

    expect(directInstr).toBe('light')

    // Access the same ModuleRuntime via RuntimeProvider + useModule; expect instrumentation to match.
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    const { result } = renderHook(
      () => {
        const rt = useModule(InstrCounter)
        return Logix.InternalContracts.getStateTransactionInstrumentation(rt.runtime as any)
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current).toBe('light')
    })

    expect(result.current).toBe(directInstr)
  })
})
