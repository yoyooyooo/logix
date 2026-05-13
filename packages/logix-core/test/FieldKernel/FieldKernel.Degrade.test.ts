import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import type { Draft } from '../../src/Logic.js'

describe('FieldKernel degrade', () => {
  it.effect('runtime error should degrade (commit base, freeze derived)', () =>
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
        derived: Schema.Number,
      })

      type S = Schema.Schema.Type<typeof State>

      const Actions = { bump: Schema.Void }

      const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldKernelDegradeRuntimeError', {
  state: State,
  actions: Actions,
  reducers: {
          bump: Logix.Module.Reducer.mutate((draft: Draft<S>) => {
            draft.base += 1
          }),
        }
}), FieldContracts.fieldFrom(State)({
          derived: FieldContracts.fieldComputed({
            deps: ['base'],
            get: () => {
              throw new Error('boom')
            },
          }),
        }))

      const programModule = Logix.Program.make(M, {
        initial: { base: 0, derived: 123 },
        logics: [],
      })

      const runtime = Logix.Runtime.make(programModule, {
        layer: CoreDebug.replace([sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)

        yield* rt.dispatch({ _tag: 'bump', payload: undefined } as any)

        const state = (yield* rt.getState) as S
        expect(state.base).toBe(1)
        // derived stays frozen at the old value (do not write partial results).
        expect(state.derived).toBe(123)

        const degraded = events.find(
          (e) => e.type === 'diagnostic' && e.code === 'field::runtime_error' && e.severity === 'warning',
        )
        expect(degraded).toBeDefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
