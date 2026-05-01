import { describe } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RowId from '../../../src/internal/field-kernel/rowid.js'
import * as FieldValidate from '../../../src/internal/field-kernel/validate.js'

describe('FieldKernel nested list rowId stability', () => {
  const ItemSchema = Schema.Struct({
    sku: Schema.String,
  })

  const OrderSchema = Schema.Struct({
    orderNo: Schema.String,
    items: Schema.Array(ItemSchema),
  })

  const StateSchema = Schema.Struct({
    orders: Schema.Array(OrderSchema),
    errors: Schema.Any,
  })

  type State = Schema.Schema.Type<typeof StateSchema>
  type Order = Schema.Schema.Type<typeof OrderSchema>
  type Item = Schema.Schema.Type<typeof ItemSchema>

  const fieldSpec = FieldContracts.fieldFrom(StateSchema)({
    orders: FieldContracts.fieldList<Order>({}),
    'orders.items': FieldContracts.fieldList<Item>({
      item: FieldContracts.fieldNode<Item>({
        check: {
          alwaysError: {
            deps: ['sku'],
            validate: () => ({ sku: 'bad' }),
          },
        },
      }),
    }),
  } as any)

  const program = FieldContracts.buildFieldProgram(StateSchema, fieldSpec)

  const run = (rowIdStore: RowId.RowIdStore, initial: State) =>
    Effect.gen(function* () {
      let draft: State = initial
      const ctx: FieldValidate.ValidateContext<any> = {
        moduleId: 'M',
        instanceId: 'i-1',
        origin: { kind: 'test', name: 'scopedValidate' },
        rowIdStore,
        listConfigs: RowId.collectListConfigs(fieldSpec as any),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: () => {},
      }

      yield* FieldValidate.validateInTransaction(program as any, ctx, [
        { mode: 'manual', target: { kind: 'root' } },
      ])
      return draft
    })

  it.effect('child list $rowId stays bound to parent rowId across parent reorder', () =>
    Effect.gen(function* () {
      const orderA: Order = { orderNo: 'A', items: [{ sku: 'A1' }] }
      const orderB: Order = { orderNo: 'B', items: [{ sku: 'B1' }] }

      const rowIdStore = new RowId.RowIdStore('i-nested-rowid')

      const first = yield* run(rowIdStore, { orders: [orderA, orderB], errors: {} } as any)
      const aRowId = first.errors.orders?.rows?.[0]?.items?.rows?.[0]?.$rowId as string | undefined
      const bRowId = first.errors.orders?.rows?.[1]?.items?.rows?.[0]?.$rowId as string | undefined

      expect(typeof aRowId).toBe('string')
      expect(typeof bRowId).toBe('string')
      expect(aRowId).not.toBe(bRowId)

      const second = yield* run(rowIdStore, { orders: [orderB, orderA], errors: {} } as any)
      const bRowIdAfter = second.errors.orders?.rows?.[0]?.items?.rows?.[0]?.$rowId as string | undefined
      const aRowIdAfter = second.errors.orders?.rows?.[1]?.items?.rows?.[0]?.$rowId as string | undefined

      expect(bRowIdAfter).toBe(bRowId)
      expect(aRowIdAfter).toBe(aRowId)
    }),
  )
})
