// Public barrel for @logixjs/core-ng
// Recommended usage:
//   import * as CoreNg from "@logixjs/core-ng"
// Then CoreNg exposes namespaces like coreNgKernelLayer, etc.

export { coreNgKernelLayer, coreNgFullCutoverLayer } from './CoreNgLayer.js'
export type * from './CoreNgLayer.js'

import { CORE_NG_IMPL_ID, coreNgRuntimeServicesRegistry } from './RuntimeServices.impls.js'

export { CORE_NG_IMPL_ID, coreNgRuntimeServicesRegistry }
export type * from './RuntimeServices.impls.js'
