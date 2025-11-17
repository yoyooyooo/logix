import { Schema } from 'effect'
import * as Logix from '@logix/core'
import { CustomerSummarySchema } from './model.js'

export const CustomerSearchStateSchema = Schema.Struct({
  keyword: Schema.String,
  results: Schema.Array(CustomerSummarySchema),
  isSearching: Schema.Boolean,
  errorMessage: Schema.optional(Schema.String),
})

export const CustomerSearchActionMap = {
  'customerSearch/setKeyword': Schema.String,
  'customerSearch/trigger': Schema.Void,
}

export type CustomerSearchShape = Logix.Shape<typeof CustomerSearchStateSchema, typeof CustomerSearchActionMap>

export const CustomerSearchDef = Logix.Module.make('CustomerSearch', {
  state: CustomerSearchStateSchema,
  actions: CustomerSearchActionMap,
})

