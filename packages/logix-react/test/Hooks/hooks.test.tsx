import { renderHook, act, waitFor } from '@testing-library/react'
import { RuntimeProvider, useModule, useSelector, useRuntime } from '../../src/index.js'
import * as Logix from '@logix/core'
import { Context, Effect, Layer, Schema, ManagedRuntime, SubscriptionRef } from 'effect'
import { describe, it, expect, beforeEach } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'

describe('React Hooks', () => {
  const State = Schema.Struct({ count: Schema.Number })
  const Actions = { inc: Schema.Void }
  const CounterModule = Logix.Module.make('Counter', {
    state: State,
    actions: Actions,
  })

  let runtime: ManagedRuntime.ManagedRuntime<any, any>

  beforeEach(() => {
    runtime = ManagedRuntime.make(CounterModule.live({ count: 0 }) as Layer.Layer<any, never, never>)
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
      {children}
    </RuntimeProvider>
  )

  it('useModule(handle) should return module runtime', async () => {
    const { result, rerender } = renderHook(() => useModule(CounterModule.tag), {
      wrapper,
    })
    await waitFor(() => expect(typeof result.current.dispatch).toBe('function'))
    const firstInstance = result.current
    rerender()
    expect(result.current).toBe(firstInstance)
  })

  it('useModule(handle, selector) should return state', async () => {
    const { result } = renderHook(
      () =>
        // In aggregated hooks tests we don't over-constrain types; only verify behavior.
        useModule(CounterModule.tag, (s) => (s as { readonly count: number }).count),
      { wrapper },
    )
    await waitFor(() => expect(result.current).toBe(0))
  })

  it('useSelector should return state and update', async () => {
    const { result } = renderHook(
      () => useSelector(CounterModule.tag, (s) => (s as { readonly count: number }).count),
      { wrapper },
    )
    await waitFor(() => expect(result.current).toBe(0))

    // Update state
    await runtime.runPromise(Effect.flatMap(CounterModule.tag, (rt) => rt.setState({ count: 1 })))

    await waitFor(() => expect(result.current).toBe(1))
  })

  it('should react to state changes', async () => {
    const { result } = renderHook(() => useModule(CounterModule.tag, (s) => (s as { readonly count: number }).count), {
      wrapper,
    })

    await waitFor(() => expect(result.current).toBe(0))

    await act(async () => {
      await runtime.runPromise(Effect.flatMap(CounterModule.tag, (rt) => rt.setState({ count: 5 })))
    })

    await waitFor(() => expect(result.current).toBe(5))
  })

  it('module runtime should support ref(selector)', async () => {
    const { result } = renderHook(() => useModule(CounterModule.tag), { wrapper })
    await waitFor(() => expect(result.current).not.toBeNull())

    const moduleRuntime = result.current
    const countRef = moduleRuntime.ref((s: { count: number }) => s.count)

    // Check initial value
    expect(await runtime.runPromise(SubscriptionRef.get(countRef))).toBe(0)

    // Update state via runtime
    await act(async () => {
      await runtime.runPromise(moduleRuntime.setState({ count: 10 }))
    })

    // Check ref updated
    expect(await runtime.runPromise(SubscriptionRef.get(countRef))).toBe(10)

    // Check read-only: SubscriptionRef API does not expose `set`; we only verify selector behavior here.
  })

  it('should support $.use-based cross-module logic with React hooks', async () => {
    const CountState = Schema.Struct({ count: Schema.Number })
    const CounterActions = { inc: Schema.Void }
    const Counter = Logix.Module.make('RemoteCounter', {
      state: CountState,
      actions: CounterActions,
    })

    const BadgeState = Schema.Struct({ text: Schema.String })
    const Badge = Logix.Module.make('Badge', {
      state: BadgeState,
      actions: {},
    })

    const counterLogic = Counter.logic(($) =>
      Effect.gen(function* () {
        yield* $.onAction('inc').run(() => $.state.update((s) => ({ ...s, count: s.count + 1 })))
      }),
    )

    const badgeLogic = Badge.logic(($) =>
      Effect.gen(function* () {
        const counter = yield* $.use(Counter)

        yield* $.on(counter.changes((s: { count: number }) => s.count))
          .filter((count) => count > 0)
          .run((count) =>
            $.state.update((s) => ({
              ...s,
              text: `count:${count}`,
            })),
          )
      }),
    )

    const CounterImpl = Counter.implement({
      initial: { count: 0 },
      logics: [counterLogic],
    })

    const BadgeImpl = Badge.implement({
      initial: { text: '' },
      logics: [badgeLogic],
      imports: [CounterImpl.impl],
    })

    runtime = Logix.Runtime.make(BadgeImpl)

    const wrapperWithApp = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const badgeHook = renderHook(() => useModule(Badge.tag, (s) => (s as { readonly text: string }).text), {
      wrapper: wrapperWithApp,
    })

    const counterHook = renderHook(
      () => {
        const host = useModule(Badge.tag)
        return host.imports.get(Counter.tag)
      },
      {
        wrapper: wrapperWithApp,
      },
    )

    await waitFor(() => expect(badgeHook.result.current).toBe(''))

    // Trigger inc via CounterModule runtime and verify Badge text updates accordingly.
    await act(async () => {
      await runtime.runPromise(
        counterHook.result.current.runtime.dispatch({
          _tag: 'inc',
          payload: undefined,
        }),
      )
    })

    await waitFor(() => expect(badgeHook.result.current).toBe('count:1'))
  })

  it('RuntimeProvider.layer should allow nested Env override', async () => {
    const StepConfigTag = Context.GenericTag<{ readonly step: number }>('@test/StepConfigReact')

    const BaseLayer = Layer.succeed(StepConfigTag, { step: 1 })
    const InnerLayer = Layer.succeed(StepConfigTag, { step: 5 })

    // Override the runtime for this case: a simple CounterModule is sufficient.
    const localRuntime = ManagedRuntime.make(CounterModule.live({ count: 0 }) as Layer.Layer<any, never, never>)

    const useStepConfigValue = () => {
      const adaptedRuntime = useRuntime()
      const [step, setStep] = React.useState<number | null>(null)

      React.useEffect(() => {
        void adaptedRuntime.runPromise(
          Effect.gen(function* () {
            const cfg = (yield* StepConfigTag) as { readonly step: number }
            setStep(cfg.step)
          }),
        )
      }, [adaptedRuntime])

      return step
    }

    const outerWrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={localRuntime} layer={BaseLayer}>
        {children}
      </RuntimeProvider>
    )

    const innerWrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={localRuntime} layer={BaseLayer}>
        <RuntimeProvider layer={InnerLayer}>{children}</RuntimeProvider>
      </RuntimeProvider>
    )

    const outerHook = renderHook(() => useStepConfigValue(), {
      wrapper: outerWrapper,
    })

    const innerHook = renderHook(() => useStepConfigValue(), {
      wrapper: innerWrapper,
    })

    await waitFor(() => expect(outerHook.result.current).toBe(1))
    await waitFor(() => expect(innerHook.result.current).toBe(5))
  })

  it('useRuntime({ layer }) should allow local Env override', async () => {
    const StepConfigTag = Context.GenericTag<{ readonly step: number }>('@test/StepConfigHook')

    const BaseLayer = Layer.succeed(StepConfigTag, { step: 1 })
    const InnerLayer = Layer.succeed(StepConfigTag, { step: 5 })

    const localRuntime = ManagedRuntime.make(CounterModule.live({ count: 0 }) as Layer.Layer<any, never, never>)

    const useStepConfigWithHookLayer = () => {
      const adaptedRuntime = useRuntime({ layer: InnerLayer })
      const [step, setStep] = React.useState<number | null>(null)

      React.useEffect(() => {
        void adaptedRuntime.runPromise(
          Effect.gen(function* () {
            const cfg = (yield* StepConfigTag) as { readonly step: number }
            setStep(cfg.step)
          }),
        )
      }, [adaptedRuntime])

      return step
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={localRuntime} layer={BaseLayer}>
        {children}
      </RuntimeProvider>
    )

    const { result } = renderHook(() => useStepConfigWithHookLayer(), {
      wrapper,
    })

    await waitFor(() => expect(result.current).toBe(5))
  })

  it('should not leak scoped resources when RuntimeProvider unmounts', async () => {
    let activeResources = 0

    const ResourceTag = Context.GenericTag<number>('@test/Resource')

    const ResourceLayer = Layer.scoped(
      ResourceTag,
      Effect.acquireRelease(
        Effect.sync(() => {
          activeResources += 1
          return 1
        }),
        () =>
          Effect.sync(() => {
            activeResources -= 1
          }),
      ),
    )

    const localRuntime = ManagedRuntime.make(CounterModule.live({ count: 0 }) as Layer.Layer<any, never, never>)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={localRuntime} layer={ResourceLayer}>
        {children}
      </RuntimeProvider>
    )

    const { unmount } = renderHook(() => useModule(CounterModule.tag, (s) => (s as { readonly count: number }).count), {
      wrapper,
    })

    await waitFor(() => {
      expect(activeResources).toBe(1)
    })

    unmount()
    await waitFor(() => {
      expect(activeResources).toBe(0)
    })
  })

  it('nested RuntimeProvider.runtime should override parent runtime', async () => {
    const DualState = Schema.Struct({ count: Schema.Number })
    const DualActions = { inc: Schema.Void }
    const DualCounter = Logix.Module.make('DualCounter', {
      state: DualState,
      actions: DualActions,
    })

    const DualLogic = DualCounter.logic(($) =>
      Effect.gen(function* () {
        // Mount watchers in the run phase to avoid triggering the Phase Guard during setup.
        yield* $.onAction('inc').update((s) => ({ ...s, count: s.count + 1 }))
      }),
    )

    const runtimeA = ManagedRuntime.make(DualCounter.live({ count: 1 }, DualLogic) as Layer.Layer<any, never, never>)
    const runtimeB = ManagedRuntime.make(DualCounter.live({ count: 10 }, DualLogic) as Layer.Layer<any, never, never>)

    const useDualCount = () => useModule(DualCounter.tag, (s) => (s as { readonly count: number }).count)

    const outerWrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtimeA} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const innerWrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtimeA} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        <RuntimeProvider runtime={runtimeB}>{children}</RuntimeProvider>
      </RuntimeProvider>
    )

    const outerHook = renderHook(() => useDualCount(), {
      wrapper: outerWrapper,
    })
    const innerHook = renderHook(() => useDualCount(), {
      wrapper: innerWrapper,
    })

    await waitFor(() => expect(outerHook.result.current).toBe(1))
    await waitFor(() => expect(innerHook.result.current).toBe(10))
  })

  it('should support multiple modules in a single RuntimeProvider', async () => {
    const LoggerState = Schema.Struct({ logs: Schema.Array(Schema.String) })
    const Logger = Logix.Module.make('Logger', {
      state: LoggerState,
      actions: { log: Schema.String },
    })

    const loggerLogic = Logger.logic(($) =>
      Effect.gen(function* () {
        // Logger listens to the log action only in the run phase.
        yield* $.onAction('log').run((action) =>
          $.state.update((s) => ({
            ...s,
            logs: [...s.logs, action.payload],
          })),
        )
      }),
    )

    // Reuse a single ManagedRuntime to mount both Counter + Logger modules.
    const localRuntime = ManagedRuntime.make(
      Layer.mergeAll(
        CounterModule.live({ count: 0 }) as Layer.Layer<any, never, any>,
        Logger.live({ logs: [] }, loggerLogic) as Layer.Layer<any, never, any>,
      ) as Layer.Layer<any, never, never>,
    )

    const multiWrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={localRuntime} policy={{ mode: 'sync', syncBudgetMs: 1000 }}>
        {children}
      </RuntimeProvider>
    )

    const counterHook = renderHook(() => useModule(CounterModule.tag), {
      wrapper: multiWrapper,
    })
    const loggerHook = renderHook(() => useModule(Logger.tag), {
      wrapper: multiWrapper,
    })

    await waitFor(() => expect(typeof counterHook.result.current.dispatch).toBe('function'))
    await waitFor(async () => {
      const state = await localRuntime.runPromise(loggerHook.result.current.getState)
      expect(state.logs).toEqual([])
    })

    // Dispatch via Logger runtime and verify it does not affect Counter runtime reference stability.
    await act(async () => {
      await localRuntime.runPromise(
        loggerHook.result.current.runtime.dispatch({
          _tag: 'log',
          payload: 'hello',
        }),
      )
    })

    await waitFor(() => expect(true).toBe(true))
    const state = await localRuntime.runPromise(loggerHook.result.current.getState)
    expect(state.logs).toEqual(['hello'])
  })
})
