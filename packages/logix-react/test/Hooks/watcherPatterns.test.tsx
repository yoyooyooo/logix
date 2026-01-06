import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Schema, ManagedRuntime, Effect, Layer, Scope } from 'effect'
import * as Logix from '@logix/core'
import type { StateOf, ActionOf } from '@logix/core'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {
    inc: Schema.Void,
    dec: Schema.Void,
  },
})

// ModuleImpl: used to verify that in React, Impl + runFork behaves the same as Tag mode.
const CounterImpl = Counter.implement({
  initial: { value: 0 },
  logics: [],
})

// Error-logging Logic: helps make logic errors visible during tests.
type CounterShape = typeof Counter.shape

const CounterErrorLogic = Counter.logic<Scope.Scope>(($) =>
  $.lifecycle.onError((cause: unknown, context: unknown) => Effect.logError('Counter logic error', cause, context)),
)

// Logic 1: use runFork-style wiring to mount two watchers in a single Logic.
const CounterRunForkLogic = Counter.logic<Scope.Scope>(($) =>
  Effect.gen(function* () {
    yield* Effect.log('CounterRunForkLogic setup')

    yield* Effect.forkScoped(
      $.onAction('inc').runParallel(
        Effect.gen(function* () {
          yield* Effect.log('CounterRunForkLogic inc watcher')
          yield* $.state.update((s) => ({ ...s, value: s.value + 1 }))
        }),
      ),
    )

    yield* Effect.forkScoped(
      $.onAction('dec').runParallel(
        Effect.gen(function* () {
          yield* Effect.log('CounterRunForkLogic dec watcher')
          yield* $.state.update((s) => ({ ...s, value: s.value - 1 }))
        }),
      ),
    )
  }),
)

// Logic 2: use Effect.all + run to mount two watchers (all in the run phase).
const CounterAllLogic = Counter.logic<Scope.Scope>(($) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        $.onAction('inc').run($.state.update((s) => ({ ...s, value: s.value + 1 }))),
        $.onAction('dec').run($.state.update((s) => ({ ...s, value: s.value - 1 }))),
      ],
      { concurrency: 'unbounded' },
    )
  }),
)

// Logic 3: manually forkScoped($.onAction().run(...)) for two watchers (equivalence check vs runFork).
const CounterManualForkLogic = Counter.logic<Scope.Scope>(($) =>
  Effect.gen(function* () {
    yield* Effect.forkScoped($.onAction('inc').runParallel($.state.update((s) => ({ ...s, value: s.value + 1 }))))

    yield* Effect.forkScoped($.onAction('dec').runParallel($.state.update((s) => ({ ...s, value: s.value - 1 }))))
  }),
)

describe('React watcher patterns integration', () => {
  it('runFork-based watcher should update state via React hooks', async () => {
    const layer = Counter.live({ value: 0 }, CounterRunForkLogic, CounterErrorLogic)
    const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>

    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        tickServicesLayer,
        Layer.provide(layer as Layer.Layer<any, never, any>, tickServicesLayer),
      ) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          {children}
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const counter = useModule(Counter.tag)
      const value = useModule(Counter.tag, (s) => (s as { value: number }).value)
      return { value, counter }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current?.value).toBe(0)
    })

    await act(async () => {
      result.current.counter.dispatchers.inc()
    })

    await waitFor(() => {
      expect(result.current.value).toBe(1)
    })

    await act(async () => {
      result.current.counter.dispatchers.dec()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })
  })

  it('Effect.all + run style watcher should update state via React hooks', async () => {
    const layer = Counter.live({ value: 0 }, CounterAllLogic, CounterErrorLogic)
    const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>

    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        tickServicesLayer,
        Layer.provide(layer as Layer.Layer<any, never, any>, tickServicesLayer),
      ) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          {children}
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const counter = useModule(Counter.tag)
      const value = useModule(Counter.tag, (s) => (s as { value: number }).value)
      return { value, counter }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })

    await act(async () => {
      result.current.counter.dispatchers.inc()
    })

    await waitFor(() => {
      expect(result.current.value).toBe(1)
    })

    await act(async () => {
      result.current.counter.dispatchers.dec()
    })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })
  })

  it('manual Effect.fork($.onAction().run(...)) watcher should behave like runFork', async () => {
    const layer = Counter.live({ value: 0 }, CounterManualForkLogic, CounterErrorLogic)
    const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>

    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        tickServicesLayer,
        Layer.provide(layer as Layer.Layer<any, never, any>, tickServicesLayer),
      ) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          {children}
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      const counter = useModule(Counter.tag)
      const value = useModule(Counter.tag, (s) => (s as { value: number }).value)
      return { value, counter }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })

    await act(async () => {
      result.current?.counter.dispatchers.inc()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(1)
    })

    await act(async () => {
      result.current?.counter.dispatchers.dec()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })
  })

  it('runFork-based watcher should also work with ModuleImpl + useModule(Impl)', async () => {
    // Build a local Module impl from CounterImpl (keep logic consistent with Tag mode).
    const CounterImplRunFork = Counter.implement({
      initial: { value: 0 },
      logics: [CounterRunForkLogic, CounterErrorLogic],
    })

    // In Impl mode, Runtime.make uses ModuleImpl as the root entrypoint,
    // and React still uses useModule(Impl) to construct/reuse ModuleRuntime within component scope.
    const runtime = Logix.Runtime.make(CounterImplRunFork, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <React.StrictMode>
        <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
          {children}
        </RuntimeProvider>
      </React.StrictMode>
    )

    const useTest = () => {
      // Consume ModuleImpl directly: useModule constructs ModuleRuntime within component scope.
      const counter = useModule(CounterImplRunFork)
      const value = useModule(counter, (s) => (s as { value: number }).value)
      return { value, counter }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })

    await act(async () => {
      result.current?.counter.dispatchers.inc()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(1)
    })

    await act(async () => {
      result.current?.counter.dispatchers.dec()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })
  })
})
