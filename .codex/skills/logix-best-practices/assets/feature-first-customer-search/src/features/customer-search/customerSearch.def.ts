import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { CustomerSummarySchema } from './model.js'

export const CustomerSearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(CustomerSummarySchema),
  isSearching: Schema.Boolean,
  errorMessage: Schema.optional(Schema.String),
})

export const CustomerSearchActions = {
  setKeyword: Schema.String,
} as const

export type CustomerSearchShape = Logix.Shape<typeof CustomerSearchStateSchema, typeof CustomerSearchActions>

export const CustomerSearchDef = Logix.Module.make('CustomerSearch', {
  state: CustomerSearchStateSchema,
  actions: CustomerSearchActions,
  immerReducers: {
    setKeyword: (draft, keyword) => {
      draft.keyword = keyword
    },
  },
})
