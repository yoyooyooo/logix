import { CustomerSearch } from './customerSearch.def.js'
import { runAutoTriggerSearch } from './patterns/autoTriggerSearch.js'
import type { CustomerApiTag } from './service.js'

export const CustomerSearchLogic = CustomerSearch.logic<CustomerApiTag>('customer-search-logic', ($) => runAutoTriggerSearch($))
