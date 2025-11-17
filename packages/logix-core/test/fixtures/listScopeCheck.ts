import { Schema } from 'effect'
import * as Logix from '../../src/index.js'

export const DEFAULT_ROW_COUNT = 100
export const DEFAULT_DUPLICATE_INDICES = [10, 20, 30] as const
export const DEFAULT_DUPLICATE_WAREHOUSE_ID = 'WH-DUP' as const

export const RowSchema = Schema.Struct({
  id: Schema.String,
  warehouseId: Schema.String,
})

export type Row = Schema.Schema.Type<typeof RowSchema>

export const makeRows = (rowCount: number = DEFAULT_ROW_COUNT): ReadonlyArray<Row> =>
  Array.from({ length: rowCount }, (_, i) => ({
    id: `row-${i}`,
    warehouseId: `WH-${String(i).padStart(3, '0')}`,
  }))

export const setWarehouseIdAt = (rows: ReadonlyArray<Row>, index: number, warehouseId: string): ReadonlyArray<Row> =>
  rows.map((row, i) => (i === index ? { ...row, warehouseId } : row))

export const applyDuplicateWarehouse = (
  rows: ReadonlyArray<Row>,
  indices: ReadonlyArray<number> = DEFAULT_DUPLICATE_INDICES,
  warehouseId: string = DEFAULT_DUPLICATE_WAREHOUSE_ID,
): ReadonlyArray<Row> => {
  let next: ReadonlyArray<Row> = rows
  for (const i of indices) next = setWarehouseIdAt(next, i, warehouseId)
  return next
}

export const ListScopeStateSchema = Schema.Struct({
  items: Schema.Array(RowSchema),
  errors: Schema.Any,
})

export type ListScopeState = Schema.Schema.Type<typeof ListScopeStateSchema>

export const makeInitialState = (options?: { readonly rowCount?: number }): ListScopeState => ({
  items: Array.from(makeRows(options?.rowCount ?? DEFAULT_ROW_COUNT)),
  errors: {},
})

export const makeUniqueWarehouseListScopeTraits = (listPath: 'items' = 'items') =>
  Logix.StateTrait.from(ListScopeStateSchema)({
    [listPath]: Logix.StateTrait.list<Row>({
      identityHint: { trackBy: 'id' },
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
                    warehouseId: '仓库选择需跨行互斥（当前重复）',
                  }
                }
              }

              return rowErrors.some(Boolean) ? { rows: rowErrors } : undefined
            },
          },
        },
      }),
    }),
  })
