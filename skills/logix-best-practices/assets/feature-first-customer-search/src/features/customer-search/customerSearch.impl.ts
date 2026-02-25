import { CustomerSearchDef } from './customerSearch.def.js'
import { CustomerSearchLogic } from './customerSearch.logic.js'
import type { CustomerApiTag } from './service.js'

export const CustomerSearchModule = CustomerSearchDef.implement<CustomerApiTag>({
  initial: {
    keyword: '',
    results: [],
    isSearching: false,
    errorMessage: undefined,
  },
  logics: [CustomerSearchLogic],
})

export const CustomerSearchImpl = CustomerSearchModule.impl
export const CustomerSearchLive = CustomerSearchImpl.layer

