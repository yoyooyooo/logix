import { describe, it, expect } from 'vitest'
import { Deferred, Effect, FiberId, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('$.use(module) unwrap', () => {
  it('should equal $.use(module.tag) and preserve handle-extend', async () => {
    const Counter = Logix.Module.make('ModuleUseCounter', {
      state: Schema.Struct({ count: Schema.Number }),
      actions: { inc: Schema.Void },
      reducers: {
        inc: Logix.Module.Reducer.mutate((draft: any) => {
          draft.count += 1
        }),
      },
    })

    const EXTEND_HANDLE = Symbol.for('logix.module.handle.extend')
    ;(Counter.tag as any)[EXTEND_HANDLE] = (
      _runtime: Logix.ModuleRuntime<any, any>,
      base: Logix.ModuleHandle<any>,
    ) => ({ ...base, extra: 'ok' })

    const CounterImpl = Counter.implement({
      initial: { count: 0 },
      logics: [],
    })

    const Host = Logix.Module.make('ModuleUseHost', {
      state: Schema.Struct({ ok: Schema.Boolean }),
      actions: {},
    })

    const done = Deferred.unsafeMake<void>(FiberId.none)

    const hostLogic = Host.logic(($) =>
      Effect.gen(function* () {
        const a = yield* $.use(Counter)
        const b = yield* $.use(Counter.tag)

        expect((a as any).extra).toBe('ok')
        expect((b as any).extra).toBe('ok')

        yield* a.dispatch({ _tag: 'inc', payload: undefined } as any)
        const next = yield* b.read((s: any) => s.count)
        expect(next).toBe(1)

        yield* Deferred.succeed(done, undefined)
      }),
    )

    const HostImpl = Host.implement({
      initial: { ok: true },
      logics: [hostLogic],
      imports: [CounterImpl.impl],
    })

    const runtime = Logix.Runtime.make(HostImpl, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    try {
      await runtime.runPromise(
        Effect.gen(function* () {
          yield* Host.tag
          yield* Deferred.await(done)
        }) as Effect.Effect<void, never, any>,
      )
    } finally {
      await runtime.dispose()
    }
  })
})
