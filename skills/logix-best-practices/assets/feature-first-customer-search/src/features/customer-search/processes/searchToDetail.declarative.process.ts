import * as Logix from '@logixjs/core'
import type { CustomerSummary } from '../model.js'
import { CustomerDetailDef } from '../customerDetail.def.js'
import { CustomerSearchDef } from '../customerSearch.def.js'

const FirstResultRead = Logix.ReadQuery.make({
  selectorId: 'customer-search:first-result',
  debugKey: 'CustomerSearch.results[0]',
  reads: ['results'],
  // 结果为空时返回 undefined，让目标模块保持“选中项可空”的确定性语义。
  select: (state: { readonly results: ReadonlyArray<CustomerSummary> }) => state.results[0],
  equalsKind: 'objectIs',
})

export const CustomerSearchToDetailDeclarativeProcess = Logix.Process.linkDeclarative(
  {
    id: 'CustomerSearchToDetailDeclarative',
    modules: [CustomerSearchDef, CustomerDetailDef] as const,
  },
  ($) => [
    {
      from: $[CustomerSearchDef.id].read(FirstResultRead),
      to: $[CustomerDetailDef.id].dispatch('syncSelected'),
    },
  ],
)
