import { Schema } from 'effect'
import * as Crud from '@logixjs/domain/Crud'

export const OrderSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  age: Schema.Number,
})

export type Order = Schema.Schema.Type<typeof OrderSchema>

export const OrdersCrud = Crud.make('demo.OrdersCrud', {
  entity: OrderSchema,
  initial: [],
  idField: 'id',
})
