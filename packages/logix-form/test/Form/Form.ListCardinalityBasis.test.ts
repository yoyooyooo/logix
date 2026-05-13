import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

describe('Form list cardinality basis', () => {
  it.effect('routes minItems/maxItems into the same submit truth', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        value: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.ListCardinalityBasis',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          reValidateOn: ['onChange'],
          initialValues: {
            items: [],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
            minItems: 1,
            maxItems: 2,
          })
          form.submit()
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        let validCount = 0
        let invalidCount = 0

        yield* handle.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const tooFewState: any = yield* handle.getState
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(tooFewState.errors?.items?.$list).toBeDefined()
        expect(tooFewState.$form.submitAttempt.blockingBasis).toBe('error')
        expect(tooFewState.$form.submitAttempt.errorCount).toBeGreaterThan(0)

        yield* handle.fieldArray('items').append({ id: 'row-1', value: 'A' })
        yield* handle.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const withinRangeState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(1)
        expect(withinRangeState.errors?.items?.$list).toBeUndefined()
        expect(withinRangeState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(withinRangeState.$form.submitAttempt.errorCount).toBe(0)

        yield* handle.fieldArray('items').append({ id: 'row-2', value: 'B' })
        yield* handle.fieldArray('items').append({ id: 'row-3', value: 'C' })
        yield* handle.submit({
          onValid: () =>
            Effect.sync(() => {
              validCount += 1
            }),
          onInvalid: () =>
            Effect.sync(() => {
              invalidCount += 1
            }),
        })

        const tooManyState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(2)
        expect(tooManyState.errors?.items?.$list).toBeDefined()
        expect(tooManyState.$form.submitAttempt.blockingBasis).toBe('error')
        expect(tooManyState.$form.submitAttempt.errorCount).toBeGreaterThan(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
