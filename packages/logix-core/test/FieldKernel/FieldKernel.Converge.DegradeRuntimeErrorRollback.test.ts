import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import type { Draft } from '../../src/Logic.js'

describe('FieldKernel converge degrade (runtime error rollback)', () => {
  it.effect('runtime error should rollback all derived writes (no partial commit)', () =>
    Effect.gen(function* () {
      const events: Array<CoreDebug.Event> = []
      const sink: CoreDebug.Sink = {
        record: (event) =>
          Effect.sync(() => {
            events.push(event)
          }),
      }

      const State = Schema.Struct({
        base: Schema.Number,
        derivedOk: Schema.Number,
        derivedBoom: Schema.Number,
      })

      type S = Schema.Schema.Type<typeof State>

      const Actions = { bump: Schema.Void }

      const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldKernelConverge_DegradeRuntimeErrorRollback', {
  state: State,
  actions: Actions,
  reducers: {
          bump: Logix.Module.Reducer.mutate((draft: Draft<S>) => {
            draft.base += 1
          }),
        }
}), FieldContracts.fieldFrom(State)({
          derivedOk: FieldContracts.fieldComputed({
            deps: ['base'],
            get: (base) => base + 1,
          }),
          derivedBoom: FieldContracts.fieldComputed({
            deps: ['derivedOk'],
            get: () => {
              throw new Error('boom')
            },
          }),
        }))

      const programModule = Logix.Program.make(M, {
        initial: { base: 0, derivedOk: 123, derivedBoom: 456 },
        logics: [],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: CoreDebug.replace([sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)
        yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

        const state = (yield* rt.getState) as any as S
        expect(state.base).toBe(1)
        // Runtime error: must roll back all derived writebacks (no partial commit).
        expect(state.derivedOk).toBe(123)
        expect(state.derivedBoom).toBe(456)

        const degraded = events.find(
          (e) => e.type === 'diagnostic' && e.code === 'field::runtime_error' && e.severity === 'warning',
        )
        expect(degraded).toBeDefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
