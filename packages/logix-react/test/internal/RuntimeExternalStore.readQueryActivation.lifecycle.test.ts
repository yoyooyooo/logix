import { describe, it, expect } from 'vitest'
import { Effect, Layer, ManagedRuntime, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { getRuntimeReadQueryExternalStore } from '../../src/internal/store/RuntimeExternalStore.js'

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const Counter = Logix.Module.make('RuntimeExternalStoreReadQueryActivationLifecycleCounter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { inc: Schema.Void },
  reducers: {
    inc: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})

const makeRuntime = () => {
  const tickServicesLayer = Logix.InternalContracts.tickServicesLayer as Layer.Layer<any, never, any>
  const counterLayer = Counter.live({ count: 0 }) as Layer.Layer<any, never, any>
  return ManagedRuntime.make(
    Layer.mergeAll(tickServicesLayer, Layer.provide(counterLayer, tickServicesLayer)) as Layer.Layer<any, never, never>,
  )
}

describe('RuntimeExternalStore readQuery activation lifecycle', () => {
  it('keeps one activation retain across grace-window resubscribe and releases once after idle', async () => {
    const runtime = makeRuntime()

    type CounterAction = { readonly _tag: 'inc'; readonly payload?: void }
    const baseHandle = runtime.runSync(Effect.service(Counter.tag).pipe(Effect.orDie)) as Logix.ModuleRuntime<
      { count: number },
      CounterAction
    >

    const selector = Logix.ReadQuery.make({
      selectorId: 'rq_activation_lifecycle',
      reads: ['count'],
      select: (state: { readonly count: number }) => state.count,
      equalsKind: 'objectIs',
    })

    let retainCount = 0
    let releaseCount = 0
    const readQueryActivationRetainSymbol = Symbol.for('logix.internal.readQueryActivationRetain')
    const originalRetainer = (baseHandle as any)[readQueryActivationRetainSymbol].bind(baseHandle)
    ;(baseHandle as any)[readQueryActivationRetainSymbol] = (compiled: any) =>
      Effect.map(originalRetainer(compiled), (release: () => void) => {
        retainCount += 1
        let released = false
        return () => {
          if (released) return
          released = true
          releaseCount += 1
          release()
        }
      })

    const store = getRuntimeReadQueryExternalStore(runtime as any, baseHandle as any, selector as any)

    const unsubscribeA = store.subscribe(() => {})
    expect(retainCount).toBe(1)
    expect(releaseCount).toBe(0)

    unsubscribeA()
    await sleep(5)

    const unsubscribeB = store.subscribe(() => {})
    expect(retainCount).toBe(1)
    expect(releaseCount).toBe(0)

    unsubscribeB()
    await sleep(32)
    expect(releaseCount).toBe(1)

    const unsubscribeC = store.subscribe(() => {})
    expect(retainCount).toBe(2)
    unsubscribeC()
    await sleep(32)
    expect(releaseCount).toBe(2)

    await runtime.dispose()
  })
})
