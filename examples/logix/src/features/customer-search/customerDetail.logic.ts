import { Effect } from 'effect'
import { CustomerDetail } from './customerDetail.def.js'

export const CustomerDetailLogic = CustomerDetail.logic('customer-detail-logic', () => Effect.void)
