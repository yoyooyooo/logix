import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import { CustomerDetailProgram, CustomerSearchProgram } from '../features/customer-search/index.js'

const Root = Logix.Module.make('FeatureFirstRoot', {
  state: Schema.Void,
  actions: {},
})

export const RootProgram = Logix.Program.make(Root, {
  initial: undefined,
  capabilities: {
    imports: [CustomerSearchProgram, CustomerDetailProgram],
  },
})
