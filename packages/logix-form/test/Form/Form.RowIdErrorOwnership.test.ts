import { describe } from 'vitest'
import { it, expect } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Form from '../../src/index.js'

describe('Form rowId error ownership', () => {
  it.scoped('remove/move/swap keep row errors attached to rowId', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>
      type Row = Schema.Schema.Type<typeof RowSchema>

      const module = Form.make('Form.RowIdErrorOwnership', {
        values: ValuesSchema,
        validateOn: ['onChange'],
        reValidateOn: ['onChange'],
        initialValues: {
          items: [
            { id: 'row-0', warehouseId: 'WH-000' },
            { id: 'row-1', warehouseId: 'WH-001' },
            { id: 'row-2', warehouseId: 'WH-002' },
          ],
        } satisfies Values,
        traits: Logix.StateTrait.from(ValuesSchema)({
          items: Logix.StateTrait.list<Row>({
            list: Logix.StateTrait.node<ReadonlyArray<Row>>({
              check: {
                uniqueWarehouse: {
                  deps: ['warehouseId'],
                  validate: (rows: ReadonlyArray<Row>) => {
                    const items = rows
                    const indicesByValue = new Map<string, Array<number>>()

                    for (let i = 0; i < items.length; i++) {
                      const v = String(items[i]?.warehouseId ?? '').trim()
                      if (!v) continue
                      const bucket = indicesByValue.get(v) ?? []
                      bucket.push(i)
                      indicesByValue.set(v, bucket)
                    }

                    const rowErrors: Array<Record<string, unknown> | undefined> = items.map(() => undefined)
                    for (const dupIndices of indicesByValue.values()) {
                      if (dupIndices.length <= 1) continue
                      for (const i of dupIndices) {
                        rowErrors[i] = {
                          warehouseId: 'dup',
                        }
                      }
                    }

                    return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
                  },
                },
              },
            }),
          }),
        }),
      })

      const runtime = Logix.Runtime.make(module, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const getRows = (state: any): any[] => state.errors?.items?.rows ?? []
      const indexById = (items: ReadonlyArray<any>): Map<string, number> =>
        new Map(items.map((row, i) => [String(row?.id ?? i), i]))

      const program = Effect.gen(function* () {
        const rt = yield* module.tag
        const controller = module.controller.make(rt)

        // Create duplicates: row-0 / row-1 should both be marked invalid and get a stable $rowId (no trackBy -> store/index).
        yield* controller.field('items.0.warehouseId').set('WH-DUP')
        yield* controller.field('items.1.warehouseId').set('WH-DUP')
        yield* Effect.sleep('20 millis')

        const s1: any = yield* controller.getState
        const rows1 = getRows(s1)
        expect(rows1[0]?.warehouseId).toBe('dup')
        expect(rows1[1]?.warehouseId).toBe('dup')
        expect(typeof rows1[0]?.$rowId).toBe('string')
        expect(typeof rows1[1]?.$rowId).toBe('string')

        const rowIdByBizId = new Map<string, string>([
          [String(s1.items?.[0]?.id), String(rows1[0].$rowId)],
          [String(s1.items?.[1]?.id), String(rows1[1].$rowId)],
        ])

        // swap: errors should move with the row, not drift to a different row.
        yield* controller.fieldArray('items').swap(0, 2)
        yield* Effect.sleep('20 millis')

        const s2: any = yield* controller.getState
        const idx2 = indexById(s2.items ?? [])
        const rows2 = getRows(s2)
        for (const [bizId, rowId] of rowIdByBizId.entries()) {
          const i = idx2.get(bizId)
          expect(i).toEqual(expect.any(Number))
          expect(rows2[i!]?.warehouseId).toBe('dup')
          expect(rows2[i!]?.$rowId).toBe(rowId)
        }

        // move: after another reorder, errors should still follow the rowId.
        const from = idx2.get('row-0') ?? 0
        yield* controller.fieldArray('items').move(from, 0)
        yield* Effect.sleep('20 millis')

        const s3: any = yield* controller.getState
        const idx3 = indexById(s3.items ?? [])
        const rows3 = getRows(s3)
        for (const [bizId, rowId] of rowIdByBizId.entries()) {
          const i = idx3.get(bizId)
          expect(i).toEqual(expect.any(Number))
          expect(rows3[i!]?.warehouseId).toBe('dup')
          expect(rows3[i!]?.$rowId).toBe(rowId)
        }

        // remove: after removing one row, errors should be cleared with no leftovers.
        const removeIndex = idx3.get('row-1') ?? 0
        yield* controller.fieldArray('items').remove(removeIndex)
        yield* Effect.sleep('20 millis')

        const s4: any = yield* controller.getState
        const rows4 = getRows(s4)
        expect(rows4.some((r) => r && (r as any).warehouseId)).toBe(false)
      })

      yield* Effect.promise(() => runtime.runPromise(program as Effect.Effect<void, never, any>))
    }),
  )
})
