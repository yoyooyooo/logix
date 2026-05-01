import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicFields - deterministic merge', () => {
  it('should produce identical final fields for different mount order', async () => {
    const State = Schema.Struct({
      a: Schema.Number,
      b: Schema.Number,
      sumA: Schema.Number,
      sumB: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicFieldsDeterministicMerge', {
      state: State,
      actions: Actions,
    })

    const fieldsA = FieldContracts.fieldFrom(State)({
      sumA: FieldContracts.fieldComputed({
        deps: ['a'],
        get: (a) => a,
      }),
    })

    const fieldsB = FieldContracts.fieldFrom(State)({
      sumB: FieldContracts.fieldComputed({
        deps: ['b'],
        get: (b) => b,
      }),
    })

    const LA = M.logic('L#A', ($) => {
      $.fields(fieldsA)
      return Effect.void
    })

    const LB = M.logic('L#B', ($) => {
      $.fields(fieldsB)
      return Effect.void
    })

    const initial = { a: 1, b: 2, sumA: 0, sumB: 0 }

    const program1 = Logix.Program.make(M, {
      initial,
      logics: [LA, LB],
    })

    const program2 = Logix.Program.make(M, {
      initial,
      logics: [LB, LA],
    })

    const runtime1 = Logix.Runtime.make(program1, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })
    const runtime2 = Logix.Runtime.make(program2, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readFinalFields = Effect.gen(function* () {
      const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
      return CoreDebug.getModuleFinalFields(rt)
    }) as Effect.Effect<ReadonlyArray<CoreDebug.ModuleFinalFieldItem>, never, any>

    try {
      const a = await runtime1.runPromise(readFinalFields)
      const b = await runtime2.runPromise(readFinalFields)
      expect(a).toEqual(b)
    } finally {
      await runtime1.dispose()
      await runtime2.dispose()
    }
  })
})
