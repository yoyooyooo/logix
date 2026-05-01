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

describe('Form row-scoped companion authoring', () => {
  it.effect('keeps field-only companion facts aligned under reorder / replace / byRowId', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        countryId: Schema.String,
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.Companion.RowScope.Authoring',
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
              const taken = new Set(
                Array.isArray(ctx.deps['items.warehouseId'])
                  ? ctx.deps['items.warehouseId'].filter((value: unknown) => typeof value === 'string' && value.length > 0)
                  : [],
              )

              return {
                availability: {
                  kind: ctx.deps.countryId ? 'interactive' : 'hidden',
                },
                candidates: {
                  items: ['WH-001', 'WH-002', 'WH-003'].filter(
                    (candidate) => candidate === ctx.value || !taken.has(candidate),
                  ),
                  keepCurrent: true,
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
        yield* handle.field('countryId').set('CN')
        yield* waitForAsync

        let state: any = yield* handle.getState
        expect(state.ui?.items?.[0]?.warehouseId?.$companion?.candidates?.items).toEqual(['WH-001', 'WH-003'])
        expect(state.ui?.items?.[1]?.warehouseId?.$companion?.candidates?.items).toEqual(['WH-002', 'WH-003'])
        expect(state.ui?.items?.[2]?.warehouseId?.$companion?.candidates?.items).toEqual(['WH-003'])

        yield* handle.fieldArray('items').swap(0, 2)
        yield* waitForAsync

        yield* handle.fieldArray('items').byRowId('row-1').update({
          id: 'row-1',
          warehouseId: 'WH-003',
        })
        yield* waitForAsync

        state = yield* handle.getState
        const row1Index = state.items.findIndex((row: any) => row?.id === 'row-1')
        expect(row1Index).toBeGreaterThanOrEqual(0)
        expect(state.ui?.items?.[row1Index]?.warehouseId?.$companion?.candidates?.items).toEqual(['WH-001', 'WH-003'])
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )

  it.effect('writes nested list companion facts to the concrete nested row path', () =>
    Effect.gen(function* () {
      const AllocationSchema = Schema.Struct({
        id: Schema.String,
        dept: Schema.String,
      })

      const RowSchema = Schema.Struct({
        id: Schema.String,
        allocations: Schema.Array(AllocationSchema),
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      const form = Form.make(
        'Form.Companion.NestedRowScope.Authoring',
        {
          values: ValuesSchema,
          initialValues: {
            items: [
              {
                id: 'item-1',
                allocations: [{ id: 'alloc-1', dept: 'A' }],
              },
            ],
          },
        },
        (define) => {
          define.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
          define.list('items.allocations', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })

          define.field('items.allocations.dept').companion({
            deps: ['items.allocations.dept'],
            lower: (ctx) => ({
              availability: {
                kind: 'interactive',
              },
              candidates: {
                items: [ctx.value],
              },
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

        const state: any = yield* handle.getState
        expect(state.ui?.items?.[0]?.allocations?.[0]?.dept?.$companion).toEqual({
          availability: {
            kind: 'interactive',
          },
          candidates: {
            items: ['A'],
          },
        })
        expect(state.ui?.items?.allocations?.[0]?.dept?.$companion).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
