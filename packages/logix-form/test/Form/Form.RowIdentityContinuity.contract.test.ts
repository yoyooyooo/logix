import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import * as Logix from '@logixjs/core'
import * as Form from '../../src/index.js'
import { materializeExtendedHandle } from '../support/form-harness.js'

const waitForAsync = Effect.promise(
  () =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, 20)
    }),
)

describe('Form row identity continuity contract', () => {
  it.effect('routes byRowId to the same business row after reorder', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const form = Form.make(
        'Form.RowIdentityContinuity.ByRowIdAfterReorder',
        {
          values: ValuesSchema,
          initialValues: {
            items: [
              { id: 'row-0', warehouseId: 'WH-000' },
              { id: 'row-1', warehouseId: 'WH-001' },
              { id: 'row-2', warehouseId: 'WH-002' },
            ],
          } satisfies Values,
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* handle.fieldArray('items').swap(0, 2)
        yield* waitForAsync

        yield* handle.fieldArray('items').byRowId('row-0').update({
          id: 'row-0',
          warehouseId: 'WH-900',
        })
        yield* waitForAsync

        const state: any = yield* handle.getState
        const items: ReadonlyArray<any> = Array.isArray(state.items) ? state.items : []
        const row0Index = items.findIndex((item) => item?.id === 'row-0')
        const row1Index = items.findIndex((item) => item?.id === 'row-1')
        const row2Index = items.findIndex((item) => item?.id === 'row-2')

        expect(row0Index).toBeGreaterThanOrEqual(0)
        expect(items[row0Index!]?.warehouseId).toBe('WH-900')
        expect(items[row1Index!]?.warehouseId).toBe('WH-001')
        expect(items[row2Index!]?.warehouseId).toBe('WH-002')
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )

  it.effect('routes byRowId to the same business row after move', () =>
    Effect.gen(function* () {
      const RowSchema = Schema.Struct({
        id: Schema.String,
        warehouseId: Schema.String,
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(RowSchema),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const form = Form.make(
        'Form.RowIdentityContinuity.ByRowIdAfterMove',
        {
          values: ValuesSchema,
          initialValues: {
            items: [
              { id: 'row-0', warehouseId: 'WH-000' },
              { id: 'row-1', warehouseId: 'WH-001' },
              { id: 'row-2', warehouseId: 'WH-002' },
            ],
          } satisfies Values,
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any

        yield* handle.fieldArray('items').move(2, 0)
        yield* waitForAsync

        yield* handle.fieldArray('items').byRowId('row-2').update({
          id: 'row-2',
          warehouseId: 'WH-902',
        })
        yield* waitForAsync

        const state: any = yield* handle.getState
        const items: ReadonlyArray<any> = Array.isArray(state.items) ? state.items : []
        const row0Index = items.findIndex((item) => item?.id === 'row-0')
        const row1Index = items.findIndex((item) => item?.id === 'row-1')
        const row2Index = items.findIndex((item) => item?.id === 'row-2')

        expect(row2Index).toBeGreaterThanOrEqual(0)
        expect(items[row2Index!]?.warehouseId).toBe('WH-902')
        expect(items[row0Index!]?.warehouseId).toBe('WH-000')
        expect(items[row1Index!]?.warehouseId).toBe('WH-001')
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )

  it.effect('routes byRowId through rowIdStore when trackBy is absent', () =>
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

      const form = Form.make(
        'Form.RowIdentityContinuity.StoreModeByRowId',
        {
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
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'store' },
            list: {
              deps: ['warehouseId'],
              validate: (rows: ReadonlyArray<Row>) => {
                const indicesByValue = new Map<string, Array<number>>()

                for (let i = 0; i < rows.length; i++) {
                  const v = String(rows[i]?.warehouseId ?? '').trim()
                  if (!v) continue
                  const bucket = indicesByValue.get(v) ?? []
                  bucket.push(i)
                  indicesByValue.set(v, bucket)
                }

                const rowErrors: Array<Record<string, unknown> | undefined> = rows.map(() => undefined)
                for (const dupIndices of indicesByValue.values()) {
                  if (dupIndices.length <= 1) continue
                  for (const i of dupIndices) {
                    rowErrors[i] = { warehouseId: 'dup' }
                  }
                }

                return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
              },
            },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const getRows = (state: any): any[] => state.errors?.items?.rows ?? []

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any
        yield* waitForAsync

        yield* handle.field('items.0.warehouseId').set('WH-DUP')
        yield* handle.field('items.1.warehouseId').set('WH-DUP')
        yield* waitForAsync

        const s1: any = yield* handle.getState
        const rows1 = getRows(s1)
        const row0RowId = String(rows1[0]?.$rowId)
        const row1RowId = String(rows1[1]?.$rowId)

        expect(row0RowId).not.toBe('row-0')
        expect(row1RowId).not.toBe('row-1')

        yield* handle.fieldArray('items').swap(0, 2)
        yield* waitForAsync

        yield* handle.fieldArray('items').byRowId(row0RowId).update({
          id: 'row-0',
          warehouseId: 'WH-900',
        })
        yield* waitForAsync

        const s2: any = yield* handle.getState
        const items: ReadonlyArray<any> = Array.isArray(s2.items) ? s2.items : []
        const row0Index = items.findIndex((item) => item?.id === 'row-0')
        const row1Index = items.findIndex((item) => item?.id === 'row-1')
        const row2Index = items.findIndex((item) => item?.id === 'row-2')

        expect(row0Index).toBeGreaterThanOrEqual(0)
        expect(items[row0Index!]?.warehouseId).toBe('WH-900')
        expect(items[row1Index!]?.warehouseId).toBe('WH-DUP')
        expect(items[row2Index!]?.warehouseId).toBe('WH-002')
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )

  it.effect('projects replacement roster rows rather than the previous roster', () =>
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

      const form = Form.make(
        'Form.RowIdentityContinuity.ReplaceRoster',
        {
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
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
            list: {
              deps: ['warehouseId'],
              validate: (rows: ReadonlyArray<Row>) => {
                const indicesByValue = new Map<string, Array<number>>()

                for (let i = 0; i < rows.length; i++) {
                  const v = String(rows[i]?.warehouseId ?? '').trim()
                  if (!v) continue
                  const bucket = indicesByValue.get(v) ?? []
                  bucket.push(i)
                  indicesByValue.set(v, bucket)
                }

                const rowErrors: Array<Record<string, unknown> | undefined> = rows.map(() => undefined)
                for (const dupIndices of indicesByValue.values()) {
                  if (dupIndices.length <= 1) continue
                  for (const i of dupIndices) {
                    rowErrors[i] = { warehouseId: 'dup' }
                  }
                }

                return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
              },
            },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const getRows = (state: any): any[] => state.errors?.items?.rows ?? []

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any
        yield* waitForAsync

        yield* handle.field('items.0.warehouseId').set('WH-DUP')
        yield* handle.field('items.1.warehouseId').set('WH-DUP')
        yield* waitForAsync

        const s1: any = yield* handle.getState
        const rows1 = getRows(s1)
        expect(rows1[0]?.$rowId).toBe('row-0')
        expect(rows1[1]?.$rowId).toBe('row-1')

        yield* handle.fieldArray('items').replace([
          { id: 'row-a', warehouseId: 'WH-010' },
          { id: 'row-b', warehouseId: 'WH-011' },
          { id: 'row-c', warehouseId: 'WH-012' },
        ])
        yield* waitForAsync

        yield* handle.field('items.0.warehouseId').set('WH-DUP')
        yield* handle.field('items.1.warehouseId').set('WH-DUP')
        yield* waitForAsync

        const s2: any = yield* handle.getState
        const rows2 = getRows(s2)
        expect(rows2[0]?.$rowId).toBe('row-a')
        expect(rows2[1]?.$rowId).toBe('row-b')
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )

  it.effect('treats store-mode replace(nextItems) as roster replacement and retires previous rowIds', () =>
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

      const form = Form.make(
        'Form.RowIdentityContinuity.StoreReplaceRoster',
        {
          values: ValuesSchema,
          validateOn: ['onChange'],
          reValidateOn: ['onChange'],
          initialValues: {
            items: [
              { id: 'row-0', warehouseId: 'WH-000' },
              { id: 'row-1', warehouseId: 'WH-001' },
            ],
          } satisfies Values,
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'store' },
            list: {
              deps: ['warehouseId'],
              validate: (rows: ReadonlyArray<Row>) => {
                const indicesByValue = new Map<string, Array<number>>()

                for (let i = 0; i < rows.length; i++) {
                  const value = String(rows[i]?.warehouseId ?? '').trim()
                  if (!value) continue
                  const bucket = indicesByValue.get(value) ?? []
                  bucket.push(i)
                  indicesByValue.set(value, bucket)
                }

                const rowErrors: Array<Record<string, unknown> | undefined> = rows.map(() => undefined)
                for (const dupIndices of indicesByValue.values()) {
                  if (dupIndices.length <= 1) continue
                  for (const i of dupIndices) {
                    rowErrors[i] = { warehouseId: 'dup' }
                  }
                }

                return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
              },
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

        yield* handle.field('items.0.warehouseId').set('WH-DUP')
        yield* handle.field('items.1.warehouseId').set('WH-DUP')
        yield* waitForAsync

        const beforeReplace: any = yield* handle.getState
        const oldRowIds = (beforeReplace.errors?.items?.rows ?? []).map((row: any) => String(row?.$rowId ?? ''))

        yield* handle.fieldArray('items').replace([
          { id: 'row-a', warehouseId: 'WH-010' },
          { id: 'row-b', warehouseId: 'WH-011' },
        ])
        yield* waitForAsync

        const afterReplaceOnly: any = yield* handle.getState
        expect(afterReplaceOnly.ui?.$cleanup?.items?.cause).toBe('replace')

        yield* handle.field('items.0.warehouseId').set('WH-DUP')
        yield* handle.field('items.1.warehouseId').set('WH-DUP')
        yield* waitForAsync

        const afterReplace: any = yield* handle.getState
        const newRowIds = (afterReplace.errors?.items?.rows ?? []).map((row: any) => String(row?.$rowId ?? ''))

        expect(newRowIds).toHaveLength(2)
        expect(newRowIds[0]).not.toBe(oldRowIds[0])
        expect(newRowIds[1]).not.toBe(oldRowIds[1])

        yield* handle.fieldArray('items').byRowId(oldRowIds[0]).update({
          id: 'stale-old-row',
          warehouseId: 'WH-900',
        })
        yield* waitForAsync

        const staleRoutingState: any = yield* handle.getState
        expect(staleRoutingState.items?.[0]?.id).toBe('row-a')
        expect(staleRoutingState.items?.[1]?.id).toBe('row-b')
        expect(staleRoutingState.items?.[0]?.warehouseId).toBe('WH-DUP')
        expect(staleRoutingState.items?.[1]?.warehouseId).toBe('WH-DUP')
        expect(staleRoutingState.ui?.$cleanup?.items?.cause).toBe('replace')

        const staleRows = (staleRoutingState.errors?.items?.rows ?? []).map((row: any) => String(row?.$rowId ?? ''))
        expect(staleRows).toEqual(newRowIds)
        expect(staleRows).not.toContain(oldRowIds[0])
        expect(staleRows).not.toContain(oldRowIds[1])
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )

  it.effect('remaps nested list row identities through outer reorder and retires them on outer replacement', () =>
    Effect.gen(function* () {
      const AllocationSchema = Schema.Struct({
        id: Schema.String,
        dept: Schema.String,
      })

      const ItemSchema = Schema.Struct({
        id: Schema.String,
        allocations: Schema.Array(AllocationSchema),
      })

      const ValuesSchema = Schema.Struct({
        items: Schema.Array(ItemSchema),
      })

      type Values = Schema.Schema.Type<typeof ValuesSchema>

      const form = Form.make(
        'Form.RowIdentityContinuity.NestedNamespace',
        {
          values: ValuesSchema,
          validateOn: ['onChange'],
          reValidateOn: ['onChange'],
          initialValues: {
            items: [
              {
                id: 'item-0',
                allocations: [
                  { id: 'alloc-0a', dept: 'sales' },
                  { id: 'alloc-0b', dept: 'finance' },
                ],
              },
              {
                id: 'item-1',
                allocations: [
                  { id: 'alloc-1a', dept: 'ops' },
                  { id: 'alloc-1b', dept: 'legal' },
                ],
              },
            ],
          } satisfies Values,
        },
        (form) => {
          form.list('items', {
            identity: { mode: 'trackBy', trackBy: 'id' },
          })
          form.list('items.allocations', {
            identity: { mode: 'trackBy', trackBy: 'id' },
            list: {
              deps: ['dept'],
              validate: (rows: ReadonlyArray<{ id: string; dept: string }>) => {
                const indicesByValue = new Map<string, Array<number>>()

                for (let i = 0; i < rows.length; i++) {
                  const v = String(rows[i]?.dept ?? '').trim()
                  if (!v) continue
                  const bucket = indicesByValue.get(v) ?? []
                  bucket.push(i)
                  indicesByValue.set(v, bucket)
                }

                const rowErrors: Array<Record<string, unknown> | undefined> = rows.map(() => undefined)
                for (const dupIndices of indicesByValue.values()) {
                  if (dupIndices.length <= 1) continue
                  for (const i of dupIndices) {
                    rowErrors[i] = { dept: 'dup' }
                  }
                }

                return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
              },
            },
          })
        },
      )

      const runtime = Logix.Runtime.make(form, {
        layer: Layer.empty as Layer.Layer<any, never, never>,
      })

      const getAllocationRowsAt = (state: any, index: number): any[] => state.errors?.items?.rows?.[index]?.allocations?.rows ?? []

      const program = Effect.gen(function* () {
        const rt = yield* Effect.service(form.tag).pipe(Effect.orDie)
        const handle = materializeExtendedHandle(form.tag, rt) as any
        yield* waitForAsync

        yield* handle.field('items.0.allocations.0.dept').set('dup')
        yield* handle.field('items.0.allocations.1.dept').set('dup')
        yield* waitForAsync

        const state: any = yield* handle.getState
        const firstAllocRows = getAllocationRowsAt(state, 0)
        const secondAllocRows = getAllocationRowsAt(state, 1)

        expect(firstAllocRows[0]?.dept).toBe('dup')
        expect(firstAllocRows[1]?.dept).toBe('dup')
        expect(firstAllocRows[0]?.$rowId).toBe('alloc-0a')
        expect(firstAllocRows[1]?.$rowId).toBe('alloc-0b')
        expect(secondAllocRows[0]).toBeUndefined()
        expect(secondAllocRows[1]).toBeUndefined()

        yield* handle.fieldArray('items').swap(0, 1)
        yield* waitForAsync

        const afterSwap: any = yield* handle.getState
        expect(afterSwap.items?.[0]?.id).toBe('item-1')
        expect(afterSwap.items?.[1]?.id).toBe('item-0')

        const swappedFirstAllocRows = getAllocationRowsAt(afterSwap, 0)
        const swappedSecondAllocRows = getAllocationRowsAt(afterSwap, 1)

        expect(swappedFirstAllocRows[0]).toBeUndefined()
        expect(swappedFirstAllocRows[1]).toBeUndefined()
        expect(swappedSecondAllocRows[0]?.dept).toBe('dup')
        expect(swappedSecondAllocRows[1]?.dept).toBe('dup')
        expect(swappedSecondAllocRows[0]?.$rowId).toBe('alloc-0a')
        expect(swappedSecondAllocRows[1]?.$rowId).toBe('alloc-0b')

        yield* handle.fieldArray('items').replace([
          {
            id: 'item-x',
            allocations: [{ id: 'alloc-x', dept: 'qa' }],
          },
        ])
        yield* waitForAsync

        const afterReplace: any = yield* handle.getState
        expect(afterReplace.items).toEqual([
          {
            id: 'item-x',
            allocations: [{ id: 'alloc-x', dept: 'qa' }],
          },
        ])
        expect(afterReplace.ui?.$cleanup?.items?.cause).toBe('replace')
        expect(getAllocationRowsAt(afterReplace, 0)[0]).toBeUndefined()
      })

      yield* Effect.promise(() => runtime.runPromise(program as any))
    }),
  )
})
