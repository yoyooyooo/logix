// Public barrel for @logix/query
// Recommended usage:
//   import * as Query from "@logix/query"
// Then Query exposes namespaces like make / traits / Engine / TanStack.

export { make } from './Query.js'
export type * from './Query.js'

export { toStateTraitSpec as traits } from './Traits.js'
export type * from './Traits.js'

export { Engine } from './Engine.js'
export type { InvalidateRequest, MiddlewareConfig } from './Engine.js'

export * as TanStack from './TanStack.js'
