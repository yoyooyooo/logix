import { describe, it, expect } from 'vitest'
// @vitest-environment happy-dom
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import * as Logix from '@logix/core'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import { RuntimeProvider } from '../../src/RuntimeProvider.js'
import { useModule } from '../../src/Hooks.js'

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
    const baseHandle = runtime.runSync(Counter.tag as any) as Logix.ModuleRuntime<{ count: number }, CounterAction>

    const moduleInstanceKey = `${baseHandle.moduleId}::${baseHandle.instanceId}`
    const runtimeStore = Logix.InternalContracts.getRuntimeStore(runtime as any) as any
    let subscribeCallCount = 0
    const subscribeOriginal = runtimeStore.subscribeTopic?.bind(runtimeStore)
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
})
