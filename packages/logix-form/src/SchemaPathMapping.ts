import type { FieldPath, SchemaError, SchemaPathMappingOptions } from './internal/schema/SchemaPathMapping.js'
import { mapSchemaErrorToFieldPaths } from './internal/schema/SchemaPathMapping.js'

export type { FieldPath, SchemaError, SchemaPathMappingOptions }
export { mapSchemaErrorToFieldPaths }

export const SchemaPathMapping = {
  mapSchemaErrorToFieldPaths,
} as const
