import { Schema } from 'effect'
import * as Logix from '@logixjs/core'
import {
  CustomerDetailImpl,
  CustomerSearchImpl,
  CustomerSearchToDetailDeclarativeProcess,
} from '../features/customer-search/index.js'

const RootDef = Logix.Module.make('FeatureFirstRoot', {
  state: Schema.Void,
  actions: {},
})

export const RootImpl = RootDef.implement({
  initial: undefined,
  imports: [CustomerSearchImpl, CustomerDetailImpl],
  // 默认采用确定性优先的 declarative 协作；
  // 若需要 async/external bridge，再切换为 features/customer-search/processes/searchToDetail.process.ts。
  processes: [CustomerSearchToDetailDeclarativeProcess],
})
