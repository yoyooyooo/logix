import type { CapabilityBlueprint } from "../internal/schema/blueprint.js"
import type { ResourceMetadata } from "../internal/model/resource.js"

/**
 * Options for declaring a Source field (ResourceField) at Schema layer.
 * 只描述资源及状态模型的元信息，不绑定具体客户端实现。
 */
export interface SourceOptions {
  readonly resource: ResourceMetadata
  readonly statusModel?: Record<string, unknown>
  readonly [key: string]: unknown
}

/**
 * Schema 侧用于声明 Source 字段能力的工厂方法。
 */
export const Source = {
  field(options: SourceOptions): CapabilityBlueprint {
    return {
      fieldPath: "",
      kind: "Source",
      options
    }
  }
}
