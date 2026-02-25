import { Effect } from 'effect'
import { CustomerDetailDef } from './customerDetail.def.js'

export const CustomerDetailLogic = CustomerDetailDef.logic(() => ({
  setup: Effect.void,
  run: Effect.void,
}))
