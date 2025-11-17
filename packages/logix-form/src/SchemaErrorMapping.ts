import {
  applySchemaErrorToState,
  toSchemaErrorTree,
  toSchemaErrorWrites,
} from './internal/schema/SchemaErrorMapping.js'

export type { SchemaErrorMappingOptions, SchemaErrorWrite } from './internal/schema/SchemaErrorMapping.js'

export { applySchemaErrorToState, toSchemaErrorTree, toSchemaErrorWrites }

export const SchemaErrorMapping = {
  applySchemaErrorToState,
  toSchemaErrorTree,
  toSchemaErrorWrites,
} as const
