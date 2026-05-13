import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForAsync = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 40)
    }),
)

describe('Form companion row-scope incremental', () => {
  it.effect('recomputes row-scoped companion after byRowId update and keeps unrelated rows stable', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        countryId: Schema.String,
        items: Schema.Array(RowSchema),
      })

      const lowerValues: Array<unknown> = []
      const form = Form.make(
        'Form.Companion.RowScope.Incremental',
        {
          values: ValuesSchema,
          initialValues: {
            countryId: 'CN',
            items: [
              { id: 'row-1', warehouseId: 'WH-001' },
              { id: 'row-2', warehouseId: 'WH-002' },
              { id: 'row-3', warehouseId: '' },
            ],
          },
        },
        (define) => {
          define.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })

          ;(define.field('items.warehouseId') as any).companion({
            deps: ['countryId', 'items.warehouseId'],
            lower: (ctx: any) => {
              lowerValues.push(ctx.value)
              const taken = new Set(
                Array.isArray(ctx.deps['items.warehouseId'])
                  ? ctx.deps['items.warehouseId'].filter((value: unknown) => typeof value === 'string' && value.length > 0)
                  : [],
              )

              return {
                candidates: {
                  items: ['WH-001', 'WH-002', 'WH-003'].filter(
                    (candidate) => candidate === ctx.value || !taken.has(candidate),
                  ),
                },
              }
            },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* waitForAsync

        const before: any = yield* handle.getState
        expect(before.ui?.items?.[0]?.warehouseId?.$companion?.candidates?.items).toEqual(['WH-001', 'WH-003'])
        expect(before.ui?.items?.[1]?.warehouseId?.$companion?.candidates?.items).toEqual(['WH-002', 'WH-003'])
        lowerValues.length = 0

        yield* handle.fieldArray('items').byRowId('row-3').update({
          id: 'row-3',
          warehouseId: 'WH-003',
        })
        yield* waitForAsync

        const after: any = yield* handle.getState
        expect(after.ui?.items?.[2]?.warehouseId?.$companion?.candidates?.items).toEqual(['WH-003'])
        expect(after.ui?.items?.[0]?.warehouseId?.$companion?.candidates?.items).toEqual(['WH-001'])
        expect(after.ui?.items?.[1]?.warehouseId?.$companion?.candidates?.items).toEqual(['WH-002'])
        expect(lowerValues).toEqual(expect.arrayContaining(['WH-001', 'WH-002', 'WH-003']))
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
