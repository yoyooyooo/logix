import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logixjs/core'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'
import { getRuntimeModuleExternalStore } from '../../src/internal/store/RuntimeExternalStore.js'

const Counter = Logix.Module.make('useSelectorSinglePulseSingleSubscriptionCounter', {
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
  return ManagedRuntime.make(
    Layer.mergeAll(
      tickServicesLayer,
      Layer.provide(counterLayer, tickServicesLayer),
      debugLayer as Layer.Layer<any, never, any>,
    ) as Layer.Layer<any, never, never>,
  )
}

describe('useSelector single pulse single subscription', () => {
  it('keeps one module-store subscription for eight selectors in one component', async () => {
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
    let topicSubscribeCallCount = 0
    const subscribeTopicOriginal = runtimeStore.subscribeTopic?.bind(runtimeStore)

    const moduleStore = getRuntimeModuleExternalStore(runtime as any, baseHandle as any) as {
      subscribe: (listener: () => void) => () => void
    }

    let subscribeCallCount = 0
    let listenerCallCount = 0
    const originalSubscribe = moduleStore.subscribe.bind(moduleStore)
    ;(moduleStore as any).subscribe = (listener: () => void) => {
      subscribeCallCount += 1
      return originalSubscribe(() => {
        listenerCallCount += 1
        listener()
      })
    }

    runtimeStore.subscribeTopic = (topicKey: string, listener: () => void) => {
      if (topicKey === moduleInstanceKey) {
        topicSubscribeCallCount += 1
      }
      return subscribeTopicOriginal(topicKey, listener)
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

    const { result, unmount } = renderHook(() => useTest(), { wrapper })

    try {
      await waitFor(() => {
        expect(result.current.a).toBe(0)
      })

      expect(topicSubscribeCallCount).toBe(1)
      await act(async () => {
        result.current.inc()
      })

      await waitFor(() => {
        expect(result.current.a).toBe(1)
      })

      expect(result.current.h).toBe(8)
      expect(topicSubscribeCallCount).toBe(1)
      expect(subscribeCallCount).toBeGreaterThan(0)
      expect(listenerCallCount).toBe(1)
    } finally {
      unmount()
      await runtime.dispose()
    }
  })
})
