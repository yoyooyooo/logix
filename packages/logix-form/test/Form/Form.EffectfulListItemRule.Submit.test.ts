import { describe, expect, it } from '@effect/vitest'
import { Duration, Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { token } from '@logixjs/i18n'
import { materializeExtendedHandle } from '../support/form-harness.js'

describe('Form effectful list.item rule submit lowering', () => {
  it.effect('awaits list.item Effect rule during submit and lowers row failures', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        sku: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.EffectfulListItemRule.Submit',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            items: [
              { id: 'row-1', sku: 'OK' },
              { id: 'row-2', sku: 'DUP' },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
            item: {
              deps: ['sku'],
              validate: (row: { readonly sku: string }) =>
                Effect.sleep(Duration.millis(10)).pipe(
                  Effect.as(row.sku === 'DUP' ? { sku: 'sku-duplicate' } : undefined),
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
        expect(invalidState.errors?.items?.rows?.[0]).toBeUndefined()
        expect(invalidState.errors?.items?.rows?.[1]?.sku?.origin).toBe('rule')
        expect(invalidState.errors?.items?.rows?.[1]?.sku?.message?._tag).toBe('i18n')
        expect(invalidState.$form.submitAttempt.blockingBasis).toBe('error')
        expect(invalidState.$form.submitAttempt.errorCount).toBe(1)

        yield* handle.fieldArray('items').byRowId('row-2').update({ id: 'row-2', sku: 'OK2' })
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
        expect(validState.errors?.items?.rows?.[1]).toBeUndefined()
        expect(validState.$form.submitAttempt.blockingBasis).toBe('none')
        expect(validState.$form.submitAttempt.errorCount).toBe(0)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('normalizes list.item rule result shapes deterministically', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        sku: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.EffectfulListItemRule.ReturnNormalization',
        {
          values: ValuesSchema,
          validateOn: ['onSubmit'],
          initialValues: {
            items: [
              { id: 'row-leaf', sku: 'LEAF' },
              { id: 'row-patch', sku: 'PATCH' },
              { id: 'row-item', sku: 'ITEM' },
              { id: 'row-empty', sku: 'EMPTY' },
            ],
          },
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
            item: {
              deps: ['sku'],
              validate: (row: { readonly sku: string }) => {
                if (row.sku === 'LEAF') {
                  return Effect.succeed(
                    Form.Error.leaf(token('form.list.item.leaf'), {
                      origin: 'rule',
                    }),
                  )
                }
                if (row.sku === 'PATCH') return Effect.succeed({ sku: 'sku-patch' })
                if (row.sku === 'ITEM') return Effect.succeed(Form.Error.item(undefined, { item: 'item-error' }))
                return Effect.succeed({})
              },
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

        yield* handle.submit()

        const state: any = yield* handle.getState
        expect(state.errors?.items?.rows?.[0]?.$item?.origin).toBe('rule')
        expect(state.errors?.items?.rows?.[0]?.origin).toBeUndefined()
        expect(state.errors?.items?.rows?.[1]?.sku?.origin).toBe('rule')
        expect(state.errors?.items?.rows?.[2]?.$item?.origin).toBe('rule')
        expect(state.errors?.items?.rows?.[3]).toBeUndefined()
        expect(state.$form.submitAttempt.blockingBasis).toBe('error')
        expect(state.$form.submitAttempt.errorCount).toBe(3)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
