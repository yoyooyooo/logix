import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicFields (setup) - remove logic', () => {
  it('should not retain fields after removing the contributing logic', async () => {
    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicFieldsRemoveLogic', {
      state: State,
      actions: Actions,
    })

    const fields = FieldContracts.fieldFrom(State)({
      sum: FieldContracts.fieldComputed({
        deps: ['value'],
        get: (value) => value,
      }),
    })

    const WithFields = M.logic('L#fields', ($) => {
      $.fields(fields)
      return Effect.void
    })

    const programA = Logix.Program.make(M, {
      initial: { value: 1, sum: 0 },
      logics: [WithFields],
    })

    const programB = Logix.Program.make(M, {
      initial: { value: 1, sum: 0 },
      logics: [],
    })

    const readFinalFields = Effect.gen(function* () {
      const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
      return CoreDebug.getModuleFinalFields(rt).map((t) => t.fieldId)
    }) as Effect.Effect<ReadonlyArray<string>, never, any>

    const runtimeA = Logix.Runtime.make(programA, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })
    const runtimeB = Logix.Runtime.make(programB, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    try {
      expect(await runtimeA.runPromise(readFinalFields)).toEqual(['sum'])
      expect(await runtimeB.runPromise(readFinalFields)).toEqual([])
    } finally {
      await runtimeA.dispose()
      await runtimeB.dispose()
    }
  })
})
