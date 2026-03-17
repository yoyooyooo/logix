import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Effect, ManagedRuntime, Schema, Layer } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule, useSelector } from '../../src/Hooks.js'

const Counter = Logix.Module.make('useSelectorLaneSubscriptionCounter', {
  state: Schema.Struct({ count: Schema.Number, other: Schema.Number }),
  actions: { inc: Schema.Void, bumpOther: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
    bumpOther: Logix.Module.Reducer.mutate((draft) => {
      draft.other += 1
    }),
  },
})

describe('useSelector(lane subscription)', () => {
  it('static lane and stable dynamic selectorId both avoid module-topic fallback on unrelated dirtyRoots', async () => {
    const layer = Counter.live({ count: 0, other: 0 })
    const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>
    const runtime = ManagedRuntime.make(
      Layer.mergeAll(
        tickServicesLayer,
        Layer.provide(layer as Layer.Layer<any, never, any>, tickServicesLayer),
      ) as Layer.Layer<any, never, never>,
    )

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RuntimeProvider runtime={runtime}>{children}</RuntimeProvider>
    )

    type CounterAction = { readonly _tag: 'inc' | 'bumpOther'; readonly payload?: void }
    const baseHandle = runtime.runSync(Effect.service(Counter.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
      { count: number; other: number },
      CounterAction
    >

    const runtimeStore = Logix.InternalContracts.getRuntimeStore(runtime as any) as any
    const moduleTopicKey = runtimeStore.getModuleTopicKey(baseHandle.moduleId, baseHandle.instanceId)

    let staticCalls = 0
    let dynamicCalls = 0

    const staticSelector = Object.assign(
      (s: { readonly count: number; readonly other: number }) => {
        staticCalls += 1
        return s.count
      },
      { fieldPaths: ['count'] },
    )

    const dynamicSelector = (s: { readonly count: number; readonly other: number }) => {
      dynamicCalls += 1
      return s.count + 1
    }

    const staticTopicKey = runtimeStore.getReadQueryTopicKey(
      moduleTopicKey,
      Logix.ReadQuery.compile(staticSelector as any).selectorId,
    )
    const dynamicTopicKey = runtimeStore.getReadQueryTopicKey(
      moduleTopicKey,
      Logix.ReadQuery.compile(dynamicSelector as any).selectorId,
    )

    let moduleTopicSubscribeCount = 0
    let staticTopicSubscribeCount = 0
    let dynamicTopicSubscribeCount = 0
    let staticTopicListenerCallCount = 0
    let dynamicTopicListenerCallCount = 0
    const subscribeOriginal = runtimeStore.subscribeTopic?.bind(runtimeStore)
    runtimeStore.subscribeTopic = (topicKey: string, listener: () => void) => {
      if (topicKey === moduleTopicKey) moduleTopicSubscribeCount += 1
      if (topicKey === staticTopicKey) staticTopicSubscribeCount += 1
      if (topicKey === dynamicTopicKey) dynamicTopicSubscribeCount += 1
      if (topicKey === staticTopicKey) {
        return subscribeOriginal(topicKey, () => {
          staticTopicListenerCallCount += 1
          listener()
        })
      }
      if (topicKey === dynamicTopicKey) {
        return subscribeOriginal(topicKey, () => {
          dynamicTopicListenerCallCount += 1
          listener()
        })
      }
      return subscribeOriginal(topicKey, listener)
    }

    const useTest = () => {
      const rt = useModule(baseHandle)
      const other = useSelector(rt, (s: any) => s.other)
      const staticCount = useSelector(rt, staticSelector as any)
      const dynamicCount = useSelector(rt, dynamicSelector as any)
      return { rt, other, staticCount, dynamicCount }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.other).toBe(0)
      expect(result.current.staticCount).toBe(0)
      expect(result.current.dynamicCount).toBe(1)
    })

    expect(moduleTopicSubscribeCount).toBe(0)
    expect(staticTopicSubscribeCount).toBe(1)
    expect(dynamicTopicSubscribeCount).toBe(1)

    const baselineStaticCalls = staticCalls
    const baselineDynamicCalls = dynamicCalls

    await act(async () => {
      result.current.rt.dispatchers.bumpOther(undefined as never)
    })

    await waitFor(() => {
      expect(result.current.other).toBe(1)
    })

    expect(staticCalls).toBe(baselineStaticCalls)
    expect(staticTopicListenerCallCount).toBe(0)
    expect(dynamicTopicListenerCallCount).toBe(0)

    await act(async () => {
      result.current.rt.dispatchers.inc(undefined as never)
    })

    await waitFor(() => {
      expect(result.current.staticCount).toBe(1)
      expect(result.current.dynamicCount).toBe(2)
    })

    expect(staticCalls).toBeGreaterThan(baselineStaticCalls)
    expect(dynamicCalls).toBeGreaterThan(baselineDynamicCalls)
    expect(staticTopicListenerCallCount).toBe(1)
    expect(dynamicTopicListenerCallCount).toBe(1)
  })
})
