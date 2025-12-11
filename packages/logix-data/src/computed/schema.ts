import type { CapabilityBlueprint } from "../internal/schema/blueprint.js"

/**
 * Options for declaring a computed field at Schema layer.
 * `deps` 和 `derive` 的具体类型由上层 Schema / Runtime 决定，
 * 这里仅作为元信息透传。
 */
export interface ComputedOptions {
  readonly deps?: unknown
  readonly derive?: unknown
  readonly [key: string]: unknown
}

/**
 * Schema 侧用于声明 Computed 字段能力的工厂方法。
 *
 * 注意：此处不会直接携带字段路径，扫描 Schema 时会根据字段所在位置
 * 注入最终的 fieldPath。
 */
export const Computed = {
  for(options: ComputedOptions): CapabilityBlueprint {
    return {
      fieldPath: "",
      kind: "Computed",
      options
    }
  }
}
