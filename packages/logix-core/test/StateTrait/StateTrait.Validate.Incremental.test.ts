import { describe, it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '../../src/index.js'
import * as Debug from '../../src/Debug.js'

describe('StateTrait validate · incremental scopes + request dedupe', () => {
  it.scoped('dedupes scopedValidate requests in a txn and validates only minimal check set', () =>
    Effect.gen(function* () {
      const StateSchema = Schema.Struct({
        a: Schema.Number,
        b: Schema.Number,
        errors: Schema.Any,
      })

      const Actions = {
        validateA: Schema.Void,
      }

      const M = Logix.Module.make('StateTraitValidateIncremental', {
        state: StateSchema,
        actions: Actions,
        reducers: {
          validateA: (s: any) => s,
        },
        traits: Logix.StateTrait.from(StateSchema)({
          a: Logix.StateTrait.node({
            check: {
              required: {
                deps: [''],
                validate: (value: unknown) => (typeof value === 'number' && value > 0 ? undefined : 'a_required'),
              },
            },
          }),
          b: Logix.StateTrait.node({
            check: {
              required: {
                deps: [''],
                validate: (value: unknown) => (typeof value === 'number' && value > 0 ? undefined : 'b_required'),
              },
            },
          }),
        }),
      })

      const ValidateLogic = M.logic(($) =>
        Effect.gen(function* () {
          yield* $.onAction('validateA').run(() =>
            Effect.gen(function* () {
              yield* Logix.TraitLifecycle.scopedValidate($ as any, {
                mode: 'valueChange',
                target: Logix.TraitLifecycle.Ref.field('a'),
              })
              yield* Logix.TraitLifecycle.scopedValidate($ as any, {
                mode: 'valueChange',
                target: Logix.TraitLifecycle.Ref.field('a'),
              })
            }),
          )
        }),
      )

      const impl = M.implement({
        initial: { a: 0, b: 0, errors: { a: 'presetA', b: 'presetB' } } as any,
        logics: [ValidateLogic],
      })

      const ring = Debug.makeRingBufferSink(256)
      const layer = Layer.mergeAll(Debug.replace([ring.sink]), Debug.diagnosticsLevel('light')) as Layer.Layer<
        any,
        never,
        never
      >

      const runtime = Logix.Runtime.make(impl, {
        layer,
      })

      const program = Effect.gen(function* () {
        const rt: any = yield* M.tag

        yield* rt.dispatch({ _tag: 'validateA', payload: undefined } as any)
        yield* Effect.sleep('10 millis')

        const state: any = yield* rt.getState
        expect(state.errors?.a).toBe('a_required')
        expect(state.errors?.b).toBe('presetB')

        const validates = ring.getSnapshot().filter((e) => e.type === 'trace:trait:validate') as ReadonlyArray<any>
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
