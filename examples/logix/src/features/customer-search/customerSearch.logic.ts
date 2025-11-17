import { CustomerSearchDef } from './customerSearch.def.js'
import { runAutoTriggerSearch } from './patterns/autoTriggerSearch.js'
import type { CustomerApiTag } from './service.js'

export const CustomerSearchLogic = CustomerSearchDef.logic<CustomerApiTag>(($) => runAutoTriggerSearch($))
