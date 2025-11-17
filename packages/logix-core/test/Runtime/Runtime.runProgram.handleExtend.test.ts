import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('Runtime.runProgram handle-extend (US1)', () => {
  it.scoped('ctx.$.use(module) preserves handle-extend (controller/extra)', () =>
    Effect.gen(function* () {
      const Counter = Logix.Module.make('Runtime.runProgram.handleExtend.Counter', {
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

      const Root = Logix.Module.make('Runtime.runProgram.handleExtend.Root', {
        state: Schema.Void,
        actions: {},
      })

      const RootImpl = Root.implement({
        initial: undefined,
        logics: [],
        imports: [CounterImpl.impl],
      })

      yield* Effect.promise(() =>
        Logix.Runtime.runProgram(
          RootImpl,
          ({ $ }) =>
            Effect.gen(function* () {
              const a = yield* $.use(Counter)
              const b = yield* $.use(Counter.tag)

              expect((a as any).extra).toBe('ok')
              expect((b as any).extra).toBe('ok')

              yield* a.dispatch({ _tag: 'inc', payload: undefined } as any)
              const count = yield* b.read((s: any) => s.count)
              expect(count).toBe(1)
            }),
          { layer: Layer.empty as Layer.Layer<any, never, never>, handleSignals: false },
        ),
      )
    }),
  )
})
