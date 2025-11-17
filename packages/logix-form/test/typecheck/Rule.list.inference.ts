import { Schema } from 'effect'
import * as Form from '../../src/index.js'

const AllocationSchema = Schema.Struct({
  id: Schema.String,
  amount: Schema.Number,
})

const CostItemSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  allocations: Schema.Array(AllocationSchema),
})

const ValuesSchema = Schema.Struct({
  items: Schema.Array(CostItemSchema),
})

const $ = Form.from(ValuesSchema)
const z = $.rules

z(
  z.list('items', {
    identity: { mode: 'trackBy', trackBy: 'id' },
    item: {
      deps: ['title'],
      validate: (row) => {
        const _title: string = row.title
        // @ts-expect-error - this field does not exist on `item`
        const _missing = row.missing
        return _title ? undefined : { title: 'required' }
      },
    },
  }),

  z.list('items', {
    // @ts-expect-error - `trackBy` must come from the item's CanonicalPath
    identity: { mode: 'trackBy', trackBy: 'missing' },
  }),

  z.list('items.allocations', {
    identity: { mode: 'trackBy', trackBy: 'id' },
    item: {
      deps: ['amount'],
      validate: (row) => {
        const _amount: number = row.amount
        // @ts-expect-error - deps/trackBy/validate should all be inferred from the item type
        const _bad: string = row.amount
        return _amount > 0 ? undefined : { amount: 'must be > 0' }
      },
    },
    list: {
      validate: (rows) => {
        const first = rows[0]
        if (!first) return undefined
        const _id: string = first.id
        // @ts-expect-error - this field does not exist on the row item
        const _nope = first.nope
        return undefined
      },
    },
  }),
)
