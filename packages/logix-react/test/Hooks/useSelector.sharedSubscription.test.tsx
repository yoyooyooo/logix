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

  const layer = Layer.mergeAll(Counter.live({ count: 0 }), debugLayer) as Layer.Layer<any, never, never>
  return ManagedRuntime.make(layer)
}

const makeInstrumentedHandle = <S, A>(
  handle: Logix.ModuleRuntime<S, A>,
  onChangesCall: () => void,
): Logix.ModuleRuntime<S, A> => {
  return new Proxy(handle as any, {
    get: (target, prop, receiver) => {
      if (prop === 'changesWithMeta') {
        return (...args: any[]) => {
          onChangesCall()
          return (target as any).changesWithMeta(...args)
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as any
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

    let changesCallCount = 0
    const handle = makeInstrumentedHandle(baseHandle, () => {
      changesCallCount += 1
    })

    const useTest = () => {
      const rt = useModule(handle)
      const a = useModule(handle, (s: any) => s.count)
      const b = useModule(handle, (s: any) => s.count + 1)
      const c = useModule(handle, (s: any) => s.count + 2)
      const d = useModule(handle, (s: any) => s.count + 3)
      const e = useModule(handle, (s: any) => s.count + 4)
      const f = useModule(handle, (s: any) => s.count + 5)
      const g = useModule(handle, (s: any) => s.count + 6)
      const h = useModule(handle, (s: any) => s.count + 7)
      return { a, b, c, d, e, f, g, h, inc: rt.actions.inc }
    }

    const { result } = renderHook(() => useTest(), { wrapper })

    await waitFor(() => {
      expect(result.current.a).toBe(0)
    })

    // 即使同一组件内有多个 useSelector，也应共享同一条底层 changesWithMeta() 订阅。
    expect(changesCallCount).toBe(1)

    await act(async () => {
      result.current.inc()
    })

    await waitFor(() => {
      expect(result.current.a).toBe(1)
    })

    // 更新后也不应额外创建新的 changesWithMeta() 订阅。
    expect(changesCallCount).toBe(1)
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
        return { rt, count, inc: rt.actions.inc }
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
        return { rt, count: a, inc: rt.actions.inc }
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
