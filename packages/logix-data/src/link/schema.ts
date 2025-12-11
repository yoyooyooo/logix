import type { CapabilityBlueprint } from "../internal/schema/blueprint.js"

/**
 * Options for declaring a Link field at Schema layer.
 * targetModule / targetFieldPath 等信息由上层场景包约定。
 */
export interface LinkOptions {
  readonly targetModuleId?: string
  readonly targetFieldPath?: string
  readonly direction?: "one-way" | "two-way"
  readonly [key: string]: unknown
}

/**
 * Schema 侧用于声明 Link 字段能力的工厂方法。
 */
export const Link = {
  to(options: LinkOptions): CapabilityBlueprint {
    return {
      fieldPath: "",
      kind: "Link",
      options
    }
  }
}
