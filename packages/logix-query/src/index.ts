// Public barrel for @logixjs/query
// Recommended usage:
//   import * as Query from "@logixjs/query"
// Then Query exposes the program-first root surface: make / Engine.

export { make } from './Query.js'
export type * from './Query.js'

export { Engine } from './Engine.js'
export type { InvalidateRequest, MiddlewareConfig } from './Engine.js'
