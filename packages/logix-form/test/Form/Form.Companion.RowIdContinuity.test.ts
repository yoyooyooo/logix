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

describe('Form companion rowId continuity', () => {
  it.effect('keeps companion attached to the same business row after reorder and byRowId update', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.Companion.RowIdContinuity',
        {
          values: ValuesSchema,
          initialValues: {
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
            deps: ['items.warehouseId'],
            lower: (ctx: any) => ({
              current: ctx.value,
            }),
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
        yield* handle.fieldArray('items').swap(0, 2)
        yield* waitForAsync

        yield* handle.fieldArray('items').byRowId('row-1').update({
          id: 'row-1',
          warehouseId: 'WH-900',
        })
        yield* waitForAsync

        const state: any = yield* handle.getState
        const row1Index = state.items.findIndex((row: any) => row?.id === 'row-1')
        expect(row1Index).toBeGreaterThanOrEqual(0)
        expect(state.ui?.items?.[row1Index]?.warehouseId?.$companion).toEqual({
          current: 'WH-900',
        })
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
