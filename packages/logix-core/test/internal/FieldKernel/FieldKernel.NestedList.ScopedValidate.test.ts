import { describe, it, expect } from '@effect/vitest'
import * as FieldContracts from '@logixjs/core/repo-internal/field-contracts'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RowId from '../../../src/internal/field-kernel/rowid.js'
import * as FieldValidate from '../../../src/internal/field-kernel/validate.js'

describe('FieldKernel nested list scoped validate', () => {
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

  const fieldSpecListScope = FieldContracts.fieldFrom(StateSchema)({
    orders: FieldContracts.fieldList<Order>({}),
    'orders.items': FieldContracts.fieldList<Item>({
      list: FieldContracts.fieldNode<ReadonlyArray<Item>>({
        check: {
          uniqueSku: {
            deps: ['sku'],
            validate: (rows: ReadonlyArray<Item>) => {
              const seen = new Set<string>()
              for (const row of rows) {
                const sku = String((row as any)?.sku ?? '').trim()
                if (!sku) continue
                if (seen.has(sku)) return 'duplicate'
                seen.add(sku)
              }
              return undefined
            },
          },
        },
      }),
    }),
  } as any)

  const fieldSpecItemScope = FieldContracts.fieldFrom(StateSchema)({
    orders: FieldContracts.fieldList<Order>({}),
    'orders.items': FieldContracts.fieldList<Item>({
      item: FieldContracts.fieldNode<Item>({
        check: {
          skuRequired: {
            deps: ['sku'],
            validate: (row: Item) => {
              const sku = String((row as any)?.sku ?? '').trim()
              return sku ? undefined : { sku: 'required' }
            },
          },
        },
      }),
    }),
  } as any)

  const programListScope = FieldContracts.buildFieldProgram(StateSchema, fieldSpecListScope)
  const programItemScope = FieldContracts.buildFieldProgram(StateSchema, fieldSpecItemScope)

  const run = (
    program: any,
    fieldSpec: any,
    initial: State,
    requests: ReadonlyArray<FieldValidate.ScopedValidateRequest>,
  ) =>
    Effect.gen(function* () {
      let draft: State = initial
      const patches: Array<any> = []
      const ctx: FieldValidate.ValidateContext<any> = {
        moduleId: 'M',
        instanceId: 'i-1',
        origin: { kind: 'test', name: 'scopedValidate' },
        listConfigs: RowId.collectListConfigs(fieldSpec as any),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: (patch) => {
          patches.push(patch)
        },
      }

      yield* FieldValidate.validateInTransaction(program as any, ctx, requests)
      return { draft, patches }
    })

  it.effect('nested list-scope check writes to errors.<parent>.rows[i].<childList>.$list', () =>
    Effect.gen(function* () {
      const orders: Order[] = [
        {
          orderNo: 'A',
          items: [{ sku: 'X' }, { sku: 'X' }],
        },
        {
          orderNo: 'B',
          items: [{ sku: 'Y' }],
        },
      ]

      const { draft } = yield* run(programListScope, fieldSpecListScope, { orders, errors: {} } as any, [
        { mode: 'manual', target: { kind: 'list', path: 'orders.items', listIndexPath: [0] } },
      ])

      expect(draft.errors.orders?.rows?.[0]?.items?.$list).toBe('duplicate')
      expect(draft.errors.orders?.rows?.[1]?.items?.$list).toBeUndefined()
      expect(draft.errors['orders.items']).toBeUndefined()
    }),
  )

  it.effect('nested item target validates the correct list instance and writes row errors', () =>
    Effect.gen(function* () {
      const orders: Order[] = [
        {
          orderNo: 'A',
          items: [{ sku: 'OK' }, { sku: '' }],
        },
        {
          orderNo: 'B',
          items: [{ sku: '' }],
        },
      ]

      const { draft } = yield* run(programItemScope, fieldSpecItemScope, { orders, errors: {} } as any, [
        {
          mode: 'manual',
          target: {
            kind: 'item',
            path: 'orders.items',
            listIndexPath: [0],
            index: 1,
            field: 'sku',
          },
        },
      ])

      expect(draft.errors.orders?.rows?.[0]?.items?.rows?.[1]?.sku).toBe('required')
      expect(draft.errors.orders?.rows?.[1]?.items?.rows?.[0]?.sku).toBeUndefined()
    }),
  )

  it.effect('out-of-bounds listIndexPath should not create phantom error rows', () =>
    Effect.gen(function* () {
      const orders: Order[] = [
        {
          orderNo: 'A',
          items: [{ sku: 'X' }, { sku: 'X' }],
        },
      ]

      const { draft } = yield* run(programListScope, fieldSpecListScope, { orders, errors: {} } as any, [
        { mode: 'manual', target: { kind: 'list', path: 'orders.items', listIndexPath: [1] } },
      ])

      expect(draft.errors).toEqual({})
    }),
  )
})
