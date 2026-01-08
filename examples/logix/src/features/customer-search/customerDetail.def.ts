import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { CustomerSummarySchema } from './model.js'

export const CustomerDetailStateSchema = Schema.Struct({
  selected: Schema.optional(CustomerSummarySchema),
})

export const CustomerDetailActionMap = {
  'customerDetail/setSelected': CustomerSummarySchema,
  'customerDetail/clear': Schema.Void,
}

export type CustomerDetailShape = Logix.Shape<typeof CustomerDetailStateSchema, typeof CustomerDetailActionMap>

export const CustomerDetailDef = Logix.Module.make('CustomerDetail', {
  state: CustomerDetailStateSchema,
  actions: CustomerDetailActionMap,
  immerReducers: {
    'customerDetail/setSelected': (draft, selected) => {
      draft.selected = selected
    },
    'customerDetail/clear': (draft) => {
      draft.selected = undefined
    },
  },
})
