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

// ModuleImpl：用于验证在 React 场景下，Impl + runFork 的行为与 Tag 模式一致
const CounterImpl = Counter.implement({
  initial: { value: 0 },
  logics: [],
})

// Error logging Logic：帮助在测试中看清逻辑错误原因
type CounterShape = typeof Counter.shape

const CounterErrorLogic = Counter.logic<Scope.Scope>(($) =>
  $.lifecycle.onError((cause: unknown, context: unknown) => Effect.logError('Counter logic error', cause, context)),
)

// Logic 1: 使用 runFork 在单个 Logic 内挂两条 watcher
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

// Logic 2: 使用 Effect.all + run 挂两条 watcher（全部在 run 段执行）
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

// Logic 3: 手写 Effect.forkScoped($.onAction().run(...)) 挂两条 watcher（对 runFork 的等价性校验）
const CounterManualForkLogic = Counter.logic<Scope.Scope>(($) =>
  Effect.gen(function* () {
    yield* Effect.forkScoped($.onAction('inc').runParallel($.state.update((s) => ({ ...s, value: s.value + 1 }))))

    yield* Effect.forkScoped($.onAction('dec').runParallel($.state.update((s) => ({ ...s, value: s.value - 1 }))))
  }),
)

describe('React watcher patterns integration', () => {
  it('runFork-based watcher should update state via React hooks', async () => {
    const layer = Counter.live({ value: 0 }, CounterRunForkLogic, CounterErrorLogic)

    const runtime = ManagedRuntime.make(
      layer as Layer.Layer<Logix.ModuleRuntime<StateOf<CounterShape>, ActionOf<CounterShape>>, never, never>,
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
      result.current.counter.actions.inc()
    })

    await waitFor(() => {
      expect(result.current.value).toBe(1)
    })

    await act(async () => {
      result.current.counter.actions.dec()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })
  })

  it('Effect.all + run style watcher should update state via React hooks', async () => {
    const layer = Counter.live({ value: 0 }, CounterAllLogic, CounterErrorLogic)

    const runtime = ManagedRuntime.make(
      layer as Layer.Layer<Logix.ModuleRuntime<StateOf<CounterShape>, ActionOf<CounterShape>>, never, never>,
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
      result.current.counter.actions.inc()
    })

    await waitFor(() => {
      expect(result.current.value).toBe(1)
    })

    await act(async () => {
      result.current.counter.actions.dec()
    })

    await waitFor(() => {
      expect(result.current.value).toBe(0)
    })
  })

  it('manual Effect.fork($.onAction().run(...)) watcher should behave like runFork', async () => {
    const layer = Counter.live({ value: 0 }, CounterManualForkLogic, CounterErrorLogic)

    const runtime = ManagedRuntime.make(
      layer as Layer.Layer<Logix.ModuleRuntime<StateOf<CounterShape>, ActionOf<CounterShape>>, never, never>,
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
      result.current?.counter.actions.inc()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(1)
    })

    await act(async () => {
      result.current?.counter.actions.dec()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })
  })

  it('runFork-based watcher should also work with ModuleImpl + useModule(Impl)', async () => {
    // 基于 CounterImpl 构造局部 Module 实现（逻辑与 Tag 模式保持一致）
    const CounterImplRunFork = Counter.implement({
      initial: { value: 0 },
      logics: [CounterRunForkLogic, CounterErrorLogic],
    })

    // Impl 模式下，通过 Runtime.make 以 ModuleImpl 作为 Root 入口，
    // React 端仍然通过 useModule(Impl) 在组件 Scope 内构造/复用 ModuleRuntime。
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
      // 这里直接消费 ModuleImpl：useModule 会在组件 Scope 内构造 ModuleRuntime
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
      result.current?.counter.actions.inc()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(1)
    })

    await act(async () => {
      result.current?.counter.actions.dec()
    })

    await waitFor(() => {
      expect(result.current).not.toBeNull()
      expect(result.current?.value).toBe(0)
    })
  })
})
