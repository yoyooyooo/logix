import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { CustomerDetailImpl, CustomerSearchImpl, CustomerSearchToDetailProcess } from '../features/customer-search/index.js'

const RootDef = Logix.Module.make('FeatureFirstRoot', {
  state: Schema.Void,
  actions: {},
})

export const RootImpl = RootDef.implement({
  initial: undefined,
  imports: [CustomerSearchImpl, CustomerDetailImpl],
  processes: [CustomerSearchToDetailProcess],
})

