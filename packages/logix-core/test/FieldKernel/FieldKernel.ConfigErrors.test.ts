import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import type { Draft } from '../../src/Logic.js'
import * as Debug from '../../src/internal/debug-api.js'

describe('FieldKernel config errors', () => {
  it.effect('computed cycle should hard fail and block commit', () =>
    Effect.gen(function* () {
      const State = Schema.Struct({
        base: Schema.Number,
        a: Schema.Number,
        b: Schema.Number,
      })

      const Actions = { bump: Schema.Void }

      type S = Schema.Schema.Type<typeof State>

      const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldKernelConfigErrorCycle', {
  state: State,
  actions: Actions,
  reducers: {
          bump: Logix.Module.Reducer.mutate((draft: Draft<S>) => {
            draft.base += 1
          }),
        }
}), FieldContracts.fieldFrom(State)({
          a: FieldContracts.fieldComputed({
            deps: ['b'],
            get: (b) => b + 1,
          }),
          b: FieldContracts.fieldComputed({
            deps: ['a'],
            get: (a) => a + 1,
          }),
        }))

      const programModule = Logix.Program.make(M, {
        initial: { base: 0, a: 0, b: 0 },
        logics: [],
      })

      const ring = Debug.makeRingBufferSink(32)

      const runtime = Logix.Runtime.make(programModule, {
        layer: Debug.replace([ring.sink]) as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)

        const exit = yield* Effect.exit(rt.dispatch({ _tag: 'bump', payload: undefined } as any))

        expect(exit._tag).toBe('Failure')

        const state = (yield* rt.getState) as S
        expect(state).toEqual({ base: 0, a: 0, b: 0 })
        const diagnostics = ring
          .getSnapshot()
          .filter((e) => e.type === 'diagnostic' && e.code === 'field_kernel::config_error') as ReadonlyArray<
          Extract<Debug.Event, { readonly type: 'diagnostic' }>
        >

        expect(diagnostics.length).toBeGreaterThan(0)
        expect(diagnostics[0]?.severity).toBe('error')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
