import { Schema } from 'effect'
import * as Logix from '@logix/core'
import { CustomerSummarySchema } from './model.js'

export const CustomerDetailStateSchema = Schema.Struct({
  selected: Schema.optional(CustomerSummarySchema),
})

export const CustomerDetailActions = {
  setSelected: CustomerSummarySchema,
  clear: Schema.Void,
} as const

export type CustomerDetailShape = Logix.Shape<typeof CustomerDetailStateSchema, typeof CustomerDetailActions>

export const CustomerDetailDef = Logix.Module.make('CustomerDetail', {
  state: CustomerDetailStateSchema,
  actions: CustomerDetailActions,
  immerReducers: {
    setSelected: (draft, selected) => {
      draft.selected = selected
    },
    clear: (draft) => {
      draft.selected = undefined
    },
  },
})
