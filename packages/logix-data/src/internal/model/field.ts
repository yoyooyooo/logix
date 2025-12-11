export type FieldPathSegment = string | number

/**
 * Field describes a single state field inside a Logix module.
 * It is intentionally generic and does not depend on any Schema implementation.
 */
export interface Field {
  /**
   * Logical identifier of the field within a module.
   * Usually derived from its path, but kept as a stable ID for graph usage.
   */
  readonly id: string

  /**
   * Dot-notation path representation, e.g. "user.profile.name" or "items[*].price".
   */
  readonly path: string

  /**
   * Structured path segments for programmatic handling, including list wildcards.
   */
  readonly pathSegments: ReadonlyArray<FieldPathSegment>

  /**
   * Optional human‑readable label for DevTools and platform UIs.
   */
  readonly displayName?: string

  /**
   * Normalised value type description, e.g. "string", "number", "boolean",
   * "object", "array", or更细粒度的自定义标识（如 "User", "Price"）。
   */
  readonly valueType: string

  /**
   * Arbitrary additional metadata; semantics defined by higher‑level packages.
   */
  readonly metadata?: Record<string, unknown>
}

