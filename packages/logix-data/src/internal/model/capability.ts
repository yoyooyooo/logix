import type { ResourceMetadata } from "./resource.js"

export type FieldCapabilityKind = "Raw" | "Computed" | "Source" | "Link"

/**
 * FieldCapability describes how a field behaves inside the data layer.
 * The same field may have multiple capabilities, but in most cases a single
 * dominant capability is sufficient.
 */
export interface FieldCapability {
  /**
   * ID of the field this capability belongs to.
   */
  readonly fieldId: string

  /**
   * Kind of capability: Raw / Computed / Source / Link.
   */
  readonly kind: FieldCapabilityKind

  /**
   * For Computed / Link capabilities, the list of dependent field IDs.
   */
  readonly deps?: ReadonlyArray<string>

  /**
   * For Link capabilities, the linkage direction. Other kinds should leave this undefined.
   */
  readonly direction?: "one-way" | "two-way"

  /**
   * For Source capabilities, describes the backing external resource.
   */
  readonly resource?: ResourceMetadata

  /**
   * Optional description of how status for this capability is represented
   * in state (e.g. separate status fields, embedded status object, etc.).
   */
  readonly statusModel?: Record<string, unknown>

  /**
   * Optional extra constraints (e.g. debounce policies, recompute conditions).
   */
  readonly constraints?: Record<string, unknown>
}
