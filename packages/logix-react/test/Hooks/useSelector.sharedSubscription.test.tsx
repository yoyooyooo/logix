import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as RuntimeContracts from '@logixjs/core/repo-internal/runtime-contracts'
import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'
import { fieldValue } from '../../src/FormProjection.js'

const Counter = Logix.Module.make('useSelectorSharedSubscriptionCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const makeRuntime = (events: CoreDebug.Event[]) => {
  const debugLayer = CoreDebug.replace([
    {
      record: (event: CoreDebug.Event) =>
        Effect.sync(() => {
          events.push(event)
        }),
    },
  ]) as Layer.Layer<any, never, never>

  const tickServicesLayer = RuntimeContracts.tickServicesLayer as Layer.Layer<any, never, any>
  const counterLayer = Counter.live({ count: 0 }) as Layer.Layer<any, never, any>

  const layer = Layer.mergeAll(
    tickServicesLayer,
    Layer.provide(counterLayer, tickServicesLayer),
    debugLayer as Layer.Layer<any, never, any>,
  ) as Layer.Layer<any, never, never>
  return ManagedRuntime.make(layer)
}

const countPlus = (offset: number): RuntimeContracts.Selector.ReadQuery<{ readonly count: number }, number> => ({
  selectorId: `shared-count-plus:${offset}`,
  debugKey: `shared-count-plus(${offset})`,
  reads: ['count'],
  select: (state) => state.count + offset,
  equalsKind: 'objectIs',
})

describe('useSelector(shared subscription)', () => {
  it('shares the same exact read-query external store across repeated selector calls', async () => {
    const events: CoreDebug.Event[] = []
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
    const countRoute = RuntimeContracts.Selector.route(RuntimeContracts.Selector.compile(fieldValue('count') as any))
    const countTopicKey = `${moduleInstanceKey}::rq:${countRoute.selectorFingerprint.value}`
    const runtimeStore = RuntimeContracts.getRuntimeStore(runtime as any) as any
    let subscribeCallCount = 0
    const subscribeOriginal = runtimeStore.subscribeTopic?.bind(runtimeStore)
    runtimeStore.subscribeTopic = (topicKey: string, listener: () => void) => {
      if (topicKey === countTopicKey) {
        subscribeCallCount += 1
      }
      return subscribeOriginal(topicKey, listener)
    }

    const useTest = () => {
      const rt = useModule(baseHandle)
      const a = useSelector(baseHandle, fieldValue('count'))
      const b = useSelector(baseHandle, fieldValue('count'))
      const c = useSelector(baseHandle, fieldValue('count'))
      const d = useSelector(baseHandle, fieldValue('count'))
      const e = useSelector(baseHandle, fieldValue('count'))
      const f = useSelector(baseHandle, fieldValue('count'))
      const g = useSelector(baseHandle, fieldValue('count'))
      const h = useSelector(baseHandle, fieldValue('count'))
      return { a, b, c, d, e, f, g, h, inc: rt.dispatchers.inc }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.a).toBe(0)
    })

    // Repeated exact selector inputs share one read-query topic subscription.
    expect(subscribeCallCount).toBe(1)

    await act(async () => {
      result.current.inc()
    })

    await waitFor(() => {
      expect(result.current.a).toBe(1)
    })

    // After updates, it should still not create additional runtime-store subscriptions.
    expect(subscribeCallCount).toBe(1)
  })

  it('react-render events do not scale with selector count', async () => {
    const runScenario = async (selectors: 1 | 8) => {
      const events: CoreDebug.Event[] = []
      const runtime = makeRuntime(events)
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
      )

      let renderCount = 0

      const useTest1 = () => {
        renderCount += 1
        const rt = useModule(Counter.tag)
        const count = useSelector(rt, fieldValue('count'))
        return { rt, count, inc: rt.dispatchers.inc }
      }

      const useTest8 = () => {
        renderCount += 1
        const rt = useModule(Counter.tag)
        const a = useSelector(rt, fieldValue('count'))
        useSelector(rt, countPlus(1))
        useSelector(rt, countPlus(2))
        useSelector(rt, countPlus(3))
        useSelector(rt, countPlus(4))
        useSelector(rt, countPlus(5))
        useSelector(rt, countPlus(6))
        useSelector(rt, countPlus(7))
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
})
