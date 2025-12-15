import { make } from "./form.js"
import { traits } from "./dsl/traits.js"
import { node } from "./dsl/node.js"
import { list } from "./dsl/list.js"
import * as Rule from "./rule.js"
import * as Error from "./error.js"
import * as SchemaPathMapping from "./schema-path-mapping.js"
import * as SchemaErrorMapping from "./schema-error-mapping.js"

export type * from "./form.js"

export const Form = {
  make,
  traits,
  node,
  list,
  Rule,
  Error,
  SchemaPathMapping,
  SchemaErrorMapping,
} as const
