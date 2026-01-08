import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { CustomerSummarySchema } from './model.js'

export const CustomerSearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(CustomerSummarySchema),
  isSearching: Schema.Boolean,
  errorMessage: Schema.optional(Schema.String),
})

export const CustomerSearchActionMap = {
  'customerSearch/setKeyword': Schema.String,
}

export type CustomerSearchShape = Logix.Shape<typeof CustomerSearchStateSchema, typeof CustomerSearchActionMap>

export const CustomerSearchDef = Logix.Module.make('CustomerSearch', {
  state: CustomerSearchStateSchema,
  actions: CustomerSearchActionMap,
  immerReducers: {
    'customerSearch/setKeyword': (draft, keyword) => {
      draft.keyword = keyword
    },
  },
})
