import { Schema } from 'effect'
import { CRUDModule } from '@logixjs/domain'

export const OrderSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  age: Schema.Number,
})

export type Order = Schema.Schema.Type<typeof OrderSchema>

export const OrdersCrud = CRUDModule.make('demo.OrdersCrud', {
  entity: OrderSchema,
  initial: [],
  idField: 'id',
})
