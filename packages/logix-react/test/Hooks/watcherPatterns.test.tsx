import { describe, it, expect } from 'vitest'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Schema, ManagedRuntime, Effect, Layer, Scope } from 'effect'
import * as Logix from '@logixjs/core'
import type { StateOf, ActionOf } from '@logixjs/core/Module'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'
import { useProgramRuntimeBlueprint } from '../../src/internal/hooks/useProgramRuntimeBlueprint.js'

const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({ value: Schema.Number }),
  actions: {
    inc: Schema.Void,
    dec: Schema.Void,
  },
})

// ProgramRuntimeBlueprint: used to verify that React's internal blueprint helper behaves the same as Tag mode.
const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
  logics: [],
})
const CounterBlueprint = RuntimeContracts.getProgramRuntimeBlueprint(CounterProgram)

// Empty auxiliary Logic keeps the multi-logic test matrix stable.
type CounterShape = typeof Counter.shape

const CounterErrorLogic = Counter.logic<Scope.Scope>('counter-error-logic', () => Effect.void)

// Logic 1: use runFork-style wiring to mount two watchers in a single Logic.
const CounterRunForkLogic = Counter.logic<Scope.Scope>('counter-run-fork-logic', ($) =>
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
const CounterAllLogic = Counter.logic<Scope.Scope>('counter-all-logic', ($) =>
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
const CounterManualForkLogic = Counter.logic<Scope.Scope>('counter-manual-fork-logic', ($) =>
  Effect.gen(function* () {
    yield* Effect.forkScoped($.onAction('inc').runParallel($.state.update((s) => ({ ...s, value: s.value + 1 }))))

    yield* Effect.forkScoped($.onAction('dec').runParallel($.state.update((s) => ({ ...s, value: s.value - 1 }))))
  }),
)

describe('React watcher patterns integration', () => {
  it('runFork-based watcher should update state via React hooks', async () => {
    const layer = Counter.live({ value: 0 }, CounterRunForkLogic, CounterErrorLogic)
    const tickServicesLayer = RuntimeContracts.tickServicesLayer as Layer.Layer<any, never, any>

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
      const value = useSelector(Counter.tag, (s) => (s as { value: number }).value)
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
    const tickServicesLayer = RuntimeContracts.tickServicesLayer as Layer.Layer<any, never, any>

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
      const value = useSelector(Counter.tag, (s) => (s as { value: number }).value)
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
    const tickServicesLayer = RuntimeContracts.tickServicesLayer as Layer.Layer<any, never, any>

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
      const value = useSelector(Counter.tag, (s) => (s as { value: number }).value)
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

  it('runFork-based watcher should also work with ProgramRuntimeBlueprint + useProgramRuntimeBlueprint', async () => {
    const CounterProgramRunFork = Logix.Program.make(Counter, {
      initial: { value: 0 },
      logics: [CounterRunForkLogic, CounterErrorLogic],
    })
    const CounterBlueprintRunFork = RuntimeContracts.getProgramRuntimeBlueprint(CounterProgramRunFork)

    const runtime = Logix.Runtime.make(CounterProgramRunFork, {
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
      // Consume ProgramRuntimeBlueprint directly: useProgramRuntimeBlueprint constructs ModuleRuntime within component scope.
      const counter = useProgramRuntimeBlueprint(CounterBlueprintRunFork)
      const value = useSelector(counter, (s) => (s as { value: number }).value)
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
