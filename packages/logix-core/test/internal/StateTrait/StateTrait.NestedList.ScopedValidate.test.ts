import { describe, it, expect } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import * as Logix from '../../../src/index.js'
import * as RowId from '../../../src/internal/state-trait/rowid.js'
import * as StateTraitValidate from '../../../src/internal/state-trait/validate.js'

describe('StateTrait nested list scoped validate', () => {
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

  const traitsListScope = Logix.StateTrait.from(StateSchema)({
    orders: Logix.StateTrait.list<Order>({}),
    'orders.items': Logix.StateTrait.list<Item>({
      list: Logix.StateTrait.node<ReadonlyArray<Item>>({
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

  const traitsItemScope = Logix.StateTrait.from(StateSchema)({
    orders: Logix.StateTrait.list<Order>({}),
    'orders.items': Logix.StateTrait.list<Item>({
      item: Logix.StateTrait.node<Item>({
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

  const programListScope = Logix.StateTrait.build(StateSchema, traitsListScope)
  const programItemScope = Logix.StateTrait.build(StateSchema, traitsItemScope)

  const run = (
    program: any,
    traits: any,
    initial: State,
    requests: ReadonlyArray<StateTraitValidate.ScopedValidateRequest>,
  ) =>
    Effect.gen(function* () {
      let draft: any = initial
      const patches: Array<any> = []
      const ctx: StateTraitValidate.ValidateContext<any> = {
        moduleId: 'M',
        instanceId: 'i-1',
        origin: { kind: 'test', name: 'scopedValidate' },
        listConfigs: RowId.collectListConfigs(traits as any),
        getDraft: () => draft,
        setDraft: (next) => {
          draft = next
        },
        recordPatch: (patch) => {
          patches.push(patch)
        },
      }

      yield* StateTraitValidate.validateInTransaction(program as any, ctx, requests)
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

      const { draft } = yield* run(programListScope, traitsListScope, { orders, errors: {} } as any, [
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

      const { draft } = yield* run(programItemScope, traitsItemScope, { orders, errors: {} } as any, [
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

      const { draft } = yield* run(programListScope, traitsListScope, { orders, errors: {} } as any, [
        { mode: 'manual', target: { kind: 'list', path: 'orders.items', listIndexPath: [1] } },
      ])

      expect(draft.errors).toEqual({})
    }),
  )
})
