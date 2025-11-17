import * as Logix from '@logix/core'
import type { CustomerSearchShape } from '../customerSearch.def.js'

export const runAutoTriggerSearch = <R>($: Logix.BoundApi<CustomerSearchShape, R>) =>
  $.onState((s) => s.keyword).debounce(300).runLatest($.actions['customerSearch/trigger']())

