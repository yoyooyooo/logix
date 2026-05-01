import { describe, expect, it } from '@effect/vitest'
import { Deferred, Duration, Effect, Fiber, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

describe('Form effectful list.list rule submit lowering', () => {
  it.effect('awaits list-level Effect rule during submit and lowers $list failure', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.EffectfulListRule.Submit',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            items: [
              { id: 'row-1', warehouseId: 'WH-1' },
              { id: 'row-2', warehouseId: 'WH-1' },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
            list: {
              deps: ['warehouseId'],
              validate: (rows: ReadonlyArray<{ readonly warehouseId: string }>) =>
                Effect.sleep(Duration.millis(10)).pipe(
                  Effect.as(new Set(rows.map((row) => row.warehouseId)).size === rows.length ? undefined : 'warehouse-duplicate'),
                ),
            },
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

        const invalidState: any = yield* handle.getState
        expect(validCount).toBe(0)
        expect(invalidCount).toBe(1)
        expect(invalidState.errors?.items?.$list?.origin).toBe('rule')
        expect(invalidState.errors?.items?.$list?.message?._tag).toBe('i18n')
        expect(invalidState.$form.submitAttempt.blockingBasis).toBe('error')
        expect(invalidState.$form.submitAttempt.errorCount).toBe(1)

        yield* handle.fieldArray('items').byRowId('row-2').update({ id: 'row-2', warehouseId: 'WH-2' })
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

        const validState: any = yield* handle.getState
        expect(validCount).toBe(1)
        expect(invalidCount).toBe(1)
        expect(validState.errors?.items?.$list).toBeUndefined()
        expect(validState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(validState.$form.submitAttempt.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('drops stale list-level Effect rule completion after list value changes', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const slowStarted = yield* Deferred.make<void>()
      const releaseSlow = yield* Deferred.make<void>()

      const form = Form.make(
        'Form.EffectfulListRule.Submit.StaleDrop',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            items: [
              { id: 'row-1', warehouseId: 'WH-1' },
              { id: 'row-2', warehouseId: 'WH-1' },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
            list: {
              deps: ['warehouseId'],
              validate: (rows: ReadonlyArray<{ readonly warehouseId: string }>) =>
                new Set(rows.map((row) => row.warehouseId)).size === rows.length
                  ? Effect.succeed(undefined)
                  : Effect.gen(function* () {
                      yield* Deferred.succeed(slowStarted, undefined)
                      yield* Deferred.await(releaseSlow)
                      return 'warehouse-duplicate'
                    }),
            },
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

        const firstSubmit = yield* Effect.forkChild(handle.submit())
        yield* Deferred.await(slowStarted)
        yield* handle.fieldArray('items').byRowId('row-2').update({ id: 'row-2', warehouseId: 'WH-2' })
        const secondVerdict = yield* handle.submit()
        expect(secondVerdict.ok).toBe(true)

        yield* Deferred.succeed(releaseSlow, undefined)
        yield* Fiber.join(firstSubmit)

        const state: any = yield* handle.getState
        expect(state.errors?.items?.$list).toBeUndefined()
        expect(state.$form.submitCount).toBe(2)
        expect(state.$form.submitAttempt.seq).toBe(2)
        expect(state.$form.submitAttempt.blockingBasis).toBe('none')
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
