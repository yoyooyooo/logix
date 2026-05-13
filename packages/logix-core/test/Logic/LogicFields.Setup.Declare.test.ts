import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicFields (declaration) - declare', () => {
  it('should register declared fields with logicUnit provenance and freeze them into final fields', async () => {
    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicFieldsSetupDeclare', {
      state: State,
      actions: Actions,
    })

    const fields = FieldContracts.fieldFrom(State)({
      sum: FieldContracts.fieldComputed({
        deps: ['value'],
        get: (value) => value,
      }),
    })

    const L = M.logic('L#declare', ($) => {
      $.fields(fields)
      return Effect.void
    })

    const program = Logix.Program.make(M, {
      initial: { value: 1, sum: 0 },
      logics: [L],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readFinalFields = Effect.gen(function* () {
      const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
      const finalFields = CoreDebug.getModuleFinalFields(rt)
      return finalFields
    }) as Effect.Effect<ReadonlyArray<CoreDebug.ModuleFinalFieldItem>, never, any>

    try {
      const finalFields = await runtime.runPromise(readFinalFields)

      expect(finalFields.map((t) => t.fieldId)).toEqual(['sum'])
      expect(finalFields[0]?.provenance.originType).toBe('logicUnit')
      expect(finalFields[0]?.provenance.originId).toBe('L#declare')
      expect(finalFields[0]?.provenance.originIdKind).toBe('explicit')
    } finally {
      await runtime.dispose()
    }
  })
})
