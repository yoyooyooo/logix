import { CustomerDetailDef } from './customerDetail.def.js'
import { CustomerDetailLogic } from './customerDetail.logic.js'

export const CustomerDetailModule = CustomerDetailDef.implement({
  initial: {
    selected: undefined,
  },
  logics: [CustomerDetailLogic],
})

export const CustomerDetailImpl = CustomerDetailModule.impl
export const CustomerDetailLive = CustomerDetailImpl.layer

