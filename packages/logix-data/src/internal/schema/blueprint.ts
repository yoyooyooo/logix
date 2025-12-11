/**
 * CapabilityBlueprint describes a single capability as it appears in a Schema
 * (Layer 1). It can later be compiled into a Field + FieldCapability pair.
 */
export interface CapabilityBlueprint {
  /**
   * 字段路径占位符，扫描 Schema 时会被具体字段路径覆盖；
   * 声明能力时可以留空字符串。
   */
  readonly fieldPath: string

  /**
   * 能力类型标识，如 "Computed" / "Source" / "Link"。
   */
  readonly kind: string

  /**
   * 上层为该能力附带的任意配置，@logix/data 只做透传与约定化解析。
   */
  readonly options?: Record<string, unknown>
}

/**
 * Result of scanning a module's state Schema for field definitions and
 * capability metadata. This is the main bridge from Schema → data model.
 */
export interface CapabilityScanResult {
  readonly fields: ReadonlyArray<import("../model/field.js").Field>
  readonly capabilities: ReadonlyArray<import("../model/capability.js").FieldCapability>
}
