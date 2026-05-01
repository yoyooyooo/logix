import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/internal/debug-api.js'

describe('FieldKernel validate · incremental scopes + request dedupe', () => {
  it.effect('dedupes scopedValidate requests in a txn and validates only minimal check set', () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({
        a: Schema.Number,
        b: Schema.Number,
        errors: Schema.Any,
      })

      const Actions = {
        validateA: Schema.Void,
      }

      const M = FieldContracts.withModuleFieldDeclarations(Logix.Module.make('FieldValidateIncremental', {
  state: StateSchema,
  actions: Actions,
  reducers: {
          validateA: (s: any) => s,
        }
}), FieldContracts.fieldFrom(StateSchema)({
          a: FieldContracts.fieldNode({
            check: {
              required: {
                deps: [''],
                validate: (value: unknown) => (typeof value === 'number' && value > 0 ? undefined : 'a_required'),
              },
            },
          }),
          b: FieldContracts.fieldNode({
            check: {
              required: {
                deps: [''],
                validate: (value: unknown) => (typeof value === 'number' && value > 0 ? undefined : 'b_required'),
              },
            },
          }),
        }))

      const ValidateLogic = M.logic('validate-logic', ($) =>
        Effect.gen(function* () {
          yield* $.onAction('validateA').run(() =>
            Effect.gen(function* () {
              yield* FieldContracts.fieldScopedValidate($ as any, {
                mode: 'valueChange',
                target: FieldContracts.fieldRef.field('a'),
              })
              yield* FieldContracts.fieldScopedValidate($ as any, {
                mode: 'valueChange',
                target: FieldContracts.fieldRef.field('a'),
              })
            }),
          )
        }),
      )

      const programModule = Logix.Program.make(M, {
        initial: { a: 0, b: 0, errors: { a: 'presetA', b: 'presetB' } } as any,
        logics: [ValidateLogic],
      })

      const ring = Debug.makeRingBufferSink(256)
      const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<
        any,
        never,
        never
      >

      const runtime = Logix.Runtime.make(programModule, {
        layer,
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* Effect.service(M.tag).pipe(Effect.orDie)

        yield* rt.dispatch({ _tag: 'validateA', payload: undefined } as any)
        yield* Effect.sleep('10 millis')

        const state: any = yield* rt.getState
        expect(state.errors?.a).toBe('a_required')
        expect(state.errors?.b).toBe('presetB')

        const validates = ring.getSnapshot().filter((e) => e.type === 'trace:field:validate') as ReadonlyArray<any>
        expect(validates.length).toBeGreaterThan(0)

        const last = validates[validates.length - 1]
        expect(typeof last?.txnId).toBe('string')
        expect(typeof last?.txnSeq).toBe('number')

        const data = last?.data
        expect(data?.mode).toBe('valueChange')
        expect(data?.requestCount).toBe(1)
        expect(data?.selectedCheckCount).toBe(1)
      })

      yield* Effect.promise(() => runtime.runPromise(program))
    }),
  )
})
