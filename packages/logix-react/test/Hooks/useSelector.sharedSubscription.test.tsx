import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'
import { getRuntimeModuleExternalStore } from '../../src/internal/store/RuntimeExternalStore.js'

const Counter = Logix.Module.make('useSelectorSharedSubscriptionCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const makeRuntime = (events: Logix.Debug.Event[]) => {
  const debugLayer = Logix.Debug.replace([
    {
      record: (event: Logix.Debug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    },
  ]) as Layer.Layer<any, never, never>

  const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>
  const counterLayer = Counter.live({ count: 0 }) as Layer.Layer<any, never, any>

  const layer = Layer.mergeAll(
    tickServicesLayer,
    Layer.provide(counterLayer, tickServicesLayer),
    debugLayer as Layer.Layer<any, never, any>,
  ) as Layer.Layer<any, never, never>
  return ManagedRuntime.make(layer)
}

describe('useSelector(shared subscription)', () => {
  it('does not start one changes() subscription per useSelector call', async () => {
    const events: Logix.Debug.Event[] = []
    const runtime = makeRuntime(events)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    type CounterAction = { readonly _tag: 'inc'; readonly payload?: void }
    const baseHandle = runtime.runSync(Effect.service(Counter.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
      { count: number },
      CounterAction
    >

    const moduleInstanceKey = `${baseHandle.moduleId}::${baseHandle.instanceId}`
    const runtimeStore = Logix.InternalContracts.getRuntimeStore(runtime as any) as any
    let subscribeCallCount = 0
    const subscribeOriginal = runtimeStore.subscribeTopic?.bind(runtimeStore)

    const moduleStore = getRuntimeModuleExternalStore(runtime as any, baseHandle as any) as {
      subscribe: (listener: () => void) => () => void
    }
    let moduleStoreSubscribeCallCount = 0
    let moduleStoreListenerCallCount = 0
    const moduleStoreSubscribeOriginal = moduleStore.subscribe.bind(moduleStore)
    ;(moduleStore as any).subscribe = (listener: () => void) => {
      moduleStoreSubscribeCallCount += 1
      return moduleStoreSubscribeOriginal(() => {
        moduleStoreListenerCallCount += 1
        listener()
      })
    }

    runtimeStore.subscribeTopic = (topicKey: string, listener: () => void) => {
      if (topicKey === moduleInstanceKey) {
        subscribeCallCount += 1
      }
      return subscribeOriginal(topicKey, listener)
    }

    const useTest = () => {
      const rt = useModule(baseHandle)
      const a = useModule(baseHandle, (s: any) => s.count)
      const b = useModule(baseHandle, (s: any) => s.count + 1)
      const c = useModule(baseHandle, (s: any) => s.count + 2)
      const d = useModule(baseHandle, (s: any) => s.count + 3)
      const e = useModule(baseHandle, (s: any) => s.count + 4)
      const f = useModule(baseHandle, (s: any) => s.count + 5)
      const g = useModule(baseHandle, (s: any) => s.count + 6)
      const h = useModule(baseHandle, (s: any) => s.count + 7)
      return { a, b, c, d, e, f, g, h, inc: rt.dispatchers.inc }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.a).toBe(0)
    })

    // Even with multiple selectors in the same component, they should share a single runtime-store subscription.
    expect(subscribeCallCount).toBe(1)
    // Same topic within the same component should use one store.subscribe listener chain.
    expect(moduleStoreSubscribeCallCount).toBe(1)

    await act(async () => {
      result.current.inc()
    })

    await waitFor(() => {
      expect(result.current.a).toBe(1)
    })

    // After updates, it should still not create additional runtime-store subscriptions.
    expect(subscribeCallCount).toBe(1)
    // Listener callback fanout should stay at one callback per update for this component/topic.
    expect(moduleStoreListenerCallCount).toBe(1)
  })

  it('retains static selector activation in core across a short listener gap', async () => {
    const events: Logix.Debug.Event[] = []
    const runtime = makeRuntime(events)
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    type CounterAction = { readonly _tag: 'inc'; readonly payload?: void }
    const baseHandle = runtime.runSync(Effect.service(Counter.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
      { count: number },
      CounterAction
    >

    const selector = Object.assign((s: { readonly count: number }) => s.count, {
      fieldPaths: ['count'],
    })

    let activationStartCount = 0
    const changesReadQueryWithMetaOriginal = baseHandle.changesReadQueryWithMeta.bind(baseHandle)
    ;(baseHandle as any).changesReadQueryWithMeta = (readQuery: any) => {
      activationStartCount += 1
      return changesReadQueryWithMetaOriginal(readQuery) as any
    }

    const mountSelector = () =>
      renderHook(
        () => {
          const rt = useModule(baseHandle)
          const selected = useModule(baseHandle, selector as any)
          return { selected, inc: rt.dispatchers.inc }
        },
        { wrapper },
      )

    const first = mountSelector()

    await waitFor(() => {
      expect(first.result.current.selected).toBe(0)
    })

    expect(activationStartCount).toBe(0)

    await act(async () => {
      first.result.current.inc()
    })

    await waitFor(() => {
      expect(first.result.current.selected).toBe(1)
    })

    expect(activationStartCount).toBe(0)

    first.unmount()

    await act(async () => {
      await Promise.resolve()
    })

    const second = mountSelector()

    await waitFor(() => {
      expect(second.result.current.selected).toBe(1)
    })

    expect(activationStartCount).toBe(0)

    second.unmount()
  })

  it('react-render events do not scale with selector count', async () => {
    const runScenario = async (selectors: 1 | 8) => {
      const events: Logix.Debug.Event[] = []
      const runtime = makeRuntime(events)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
      )

      let renderCount = 0

      const useTest1 = () => {
        renderCount += 1
        const rt = useModule(Counter.tag)
        const count = useModule(rt, (s: any) => s.count)
        return { rt, count, inc: rt.dispatchers.inc }
      }

      const useTest8 = () => {
        renderCount += 1
        const rt = useModule(Counter.tag)
        const a = useModule(rt, (s: any) => s.count)
        useModule(rt, (s: any) => s.count + 1)
        useModule(rt, (s: any) => s.count + 2)
        useModule(rt, (s: any) => s.count + 3)
        useModule(rt, (s: any) => s.count + 4)
        useModule(rt, (s: any) => s.count + 5)
        useModule(rt, (s: any) => s.count + 6)
        useModule(rt, (s: any) => s.count + 7)
        return { rt, count: a, inc: rt.dispatchers.inc }
      }

      const { result } = renderHook(() => (selectors === 1 ? useTest1() : useTest8()), { wrapper })

      await waitFor(() => {
        expect(result.current.count).toBe(0)
      })

      const before = renderCount

      await act(async () => {
        result.current.inc()
      })

      await waitFor(() => {
        expect(result.current.count).toBe(1)
      })

      const after = renderCount
      return after - before
    }

    const delta1 = await runScenario(1)
    const delta8 = await runScenario(8)

    expect(delta8).toBe(delta1)
  })

  it('when lead selector is unchanged, multiplex still selects a changed hook listener', async () => {
    const events: Logix.Debug.Event[] = []
    const debugLayer = Logix.Debug.replace([
      {
        record: (event: Logix.Debug.Event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      },
    ]) as Layer.Layer<any, never, never>

    const Pair = Logix.Module.make('useSelectorSharedSubscriptionPair', {
      state: Schema.Struct({ anchor: Schema.Number, value: Schema.Number }),
      actions: { incValue: Schema.Void },
      reducers: {
        incValue: Logix.Module.Reducer.mutate((draft) => {
          draft.value += 1
        }),
      },
    })

    const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>
    const pairLayer = Pair.live({ anchor: 0, value: 0 }) as Layer.Layer<any, never, any>
    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        tickServicesLayer,
        Layer.provide(pairLayer, tickServicesLayer),
        debugLayer as Layer.Layer<any, never, any>,
      ) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    type PairAction = { readonly _tag: 'incValue'; readonly payload?: void }
    const baseHandle = runtime.runSync(Effect.service(Pair.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
      { anchor: number; value: number },
      PairAction
    >

    const useTest = () => {
      const rt = useModule(baseHandle)
      const leadUnchanged = useModule(baseHandle, (s: any) => s.anchor)
      const value = useModule(baseHandle, (s: any) => s.value)
      const plusOne = useModule(baseHandle, (s: any) => s.value + 1)
      return { leadUnchanged, value, plusOne, incValue: rt.dispatchers.incValue }
    }

    const { result, unmount } = renderHook(() => useTest(), { wrapper })

    try {
      await waitFor(() => {
        expect(result.current.value).toBe(0)
      })
      expect(result.current.leadUnchanged).toBe(0)
      expect(result.current.plusOne).toBe(1)

      await act(async () => {
        result.current.incValue()
      })

      await waitFor(() => {
        expect(result.current.value).toBe(1)
      })
      expect(result.current.leadUnchanged).toBe(0)
      expect(result.current.plusOne).toBe(2)
    } finally {
      unmount()
      await runtime.dispose()
    }
  })
})
