// Public barrel for @logix/form
// Recommended usage:
//   import * as Form from "@logix/form"
// Then Form exposes namespaces like make / traits / node / list / Rule / Error / Path.

export { make } from './Form.js'
export type * from './Form.js'

export { fromValues as from } from './Form.js'
export { derived, list, node, rules, traits } from './Form.js'

export * as FormView from './FormView.js'
export * as Rule from './Rule.js'
export * as Error from './Error.js'
export * as Trait from './Trait.js'
export { computed, link, source } from './Trait.js'
export * as Path from './Path.js'
export * as SchemaPathMapping from './SchemaPathMapping.js'
export * as SchemaErrorMapping from './SchemaErrorMapping.js'
