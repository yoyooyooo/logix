import type { FieldPath, SchemaError, SchemaPathMappingOptions } from './SchemaPathMapping.js'
import { mapSchemaErrorToFieldPaths } from './SchemaPathMapping.js'
import { setAtPath } from '../form/path.js'
import { toSchemaErrorsPath } from '../../Path.js'

export interface SchemaErrorMappingOptions extends SchemaPathMappingOptions {
  /**
   * toLeaf: converts a schemaError into a leaf value that can be written into the error tree.
   * - Default: write the raw schemaError as-is.
   */
  readonly toLeaf?: (schemaError: SchemaError) => unknown
}

export type SchemaErrorWrite = {
  /**
   * fieldPath: the field path without the `errors.` prefix (domain-facing).
   */
  readonly fieldPath: FieldPath
  /**
   * errorPath: the actual path written into state (with the `errors.` prefix).
   */
  readonly errorPath: string
  readonly error: unknown
}

export const toSchemaErrorWrites = (
  schemaError: SchemaError,
  options?: SchemaErrorMappingOptions,
): ReadonlyArray<SchemaErrorWrite> => {
  const fieldPaths = mapSchemaErrorToFieldPaths(schemaError, options)
  if (fieldPaths.length === 0) return []

  const toLeaf = options?.toLeaf ?? ((e: SchemaError) => e)
  const leaf = toLeaf(schemaError)

  return fieldPaths.map((fieldPath) => ({
    fieldPath,
    errorPath: toSchemaErrorsPath(fieldPath),
    error: leaf,
  }))
}

/**
 * toSchemaErrorTree：
 * - Produces a subtree that can be written directly to `errors.$schema` (without the `errors.$schema` prefix).
 */
export const toSchemaErrorTree = (schemaError: SchemaError, options?: SchemaErrorMappingOptions): unknown => {
  const writes = toSchemaErrorWrites(schemaError, options)
  if (writes.length === 0) return {}

  let next: unknown = {}
  for (const w of writes) {
    const prefix = 'errors.$schema.'
    const relative = w.errorPath.startsWith(prefix) ? w.errorPath.slice(prefix.length) : w.errorPath
    if (!relative) continue
    next = setAtPath(next, relative, w.error)
  }
  return next
}

/**
 * applySchemaErrorToState：
 * - Maps a SchemaError and writes it back into state.errors.$schema.*.
 * - Does not clear stale errors that are no longer matched (the caller should clear them within a more explicit scope).
 */
export const applySchemaErrorToState = (
  state: unknown,
  schemaError: SchemaError,
  options?: SchemaErrorMappingOptions,
): unknown => {
  const writes = toSchemaErrorWrites(schemaError, options)
  if (writes.length === 0) return state

  let next: unknown = state
  for (const w of writes) {
    next = setAtPath(next, w.errorPath, w.error)
  }
  return next
}
