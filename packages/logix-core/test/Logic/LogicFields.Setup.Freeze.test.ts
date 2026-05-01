import * as CoreDebug from '@logixjs/core/repo-internal/debug-api'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { describe, it, expect } from 'vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'

describe('LogicFields (declaration) - freeze / phase guard', () => {
  it('should reject $.fields(...) in run phase and keep final fields empty', async () => {
    const State = Schema.Struct({
      value: Schema.Number,
      sum: Schema.Number,
      errorCount: Schema.Number,
    })

    const Actions = {
      noop: Schema.Void,
    }

    const M = Logix.Module.make('LogicFieldsFreezeRunPhase', {
      state: State,
      actions: Actions,
    })

    const fields = FieldContracts.fieldFrom(State)({
      sum: FieldContracts.fieldComputed({
        deps: ['value'],
        get: (value) => value,
      }),
    })

    const L = M.logic('L#run', ($) =>
      Effect.gen(function* () {
        try {
          $.fields(fields)
        } catch {
          yield* $.state.mutate((draft) => {
            ;(draft as any).errorCount += 1
          })
        }
      }),
    )

    const program = Logix.Program.make(M, {
      initial: { value: 1, sum: 0, errorCount: 0 },
      logics: [L],
    })

    const runtime = Logix.Runtime.make(program, {
      layer: Layer.empty as Layer.Layer<any, never, never>,
    })

    const readOutcome = Effect.gen(function* () {
      const rt = yield* Effect.service(M.tag).pipe(Effect.orDie)
      // Give the forked run fiber a chance to be scheduled (ModuleRuntime.make also yields at the end, but this is more robust).
      yield* Effect.yieldNow
      const state = yield* rt.getState
      const finalFields = CoreDebug.getModuleFinalFields(rt)
      return {
        errorCount: (state as any).errorCount as number,
        finalFields,
      }
    }) as Effect.Effect<
      {
        readonly errorCount: number
        readonly finalFields: ReadonlyArray<CoreDebug.ModuleFinalFieldItem>
      },
      never,
      any
    >

    try {
      const result = await runtime.runPromise(readOutcome)
      expect(result.errorCount).toBe(1)
      expect(result.finalFields).toEqual([])
    } finally {
      await runtime.dispose()
    }
  })
})
