import { Effect } from 'effect'
import { CustomerDetailDef } from './customerDetail.def.js'

export const CustomerDetailLogic = CustomerDetailDef.logic(() => Effect.void)
