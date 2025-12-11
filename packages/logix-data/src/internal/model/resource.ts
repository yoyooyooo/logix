/**
 * ResourceMetadata captures how a Source field relates to an external resource.
 * It is intentionally abstract and does not depend on any specific client
 * library (query, socket, AI, etc.).
 */
export interface ResourceMetadata {
  /**
   * Resource category, e.g. "query" | "socket" | "storage" | "ai" | "env".
   */
  readonly resourceKind: string

  /**
   * Identifier used by the concrete integration layer
   * (query key, channel name, model name, etc.).
   */
  readonly identifier: string

  /**
   * Optional relation to other module state or domain entities.
   * Shape is left to platform / scenario packages.
   */
  readonly relation?: Record<string, unknown>

  /**
   * Optional description of lifecycle semantics, e.g. "per-view", "per-module".
   */
  readonly lifecycle?: string
}

