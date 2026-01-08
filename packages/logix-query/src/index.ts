// Public barrel for @logixjs/query
// Recommended usage:
//   import * as Query from "@logixjs/query"
// Then Query exposes namespaces like make / traits / Engine / TanStack.

export { make } from './Query.js'
export type * from './Query.js'

export { toStateTraitSpec as traits, source } from './Traits.js'
export type * from './Traits.js'

export { Engine } from './Engine.js'
export type { InvalidateRequest, MiddlewareConfig } from './Engine.js'

export * as TanStack from './TanStack.js'
