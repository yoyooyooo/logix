// Public barrel for @logixjs/form.
// Single-track canonical usage:
//   import * as Form from "@logixjs/form"
// This root exposes only the frozen form domain surface. Path/schema mapping
// helpers remain internal implementation details, not public subpaths.

export { make } from './Form.js'
export type * from './Form.js'

export * as Rule from './Rule.js'
export * as Error from './Error.js'
export * as Companion from './Companion.js'
