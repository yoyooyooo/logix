import type { FieldCapability } from "../model/capability.js"
import type { ResourceMetadata } from "../model/resource.js"

export interface SourceRuntimePlan {
  readonly fieldId: string
  readonly resource: ResourceMetadata | undefined
}

/**
 * 从 FieldCapability 集合中提取 Source 能力的运行时计划。
 * 不关心具体客户端库，只暴露抽象 ResourceMetadata。
 */
export const buildSourcePlan = (
  capabilities: ReadonlyArray<FieldCapability>
): ReadonlyArray<SourceRuntimePlan> =>
  capabilities
    .filter((capability) => capability.kind === "Source")
    .map((capability) => ({
      fieldId: capability.fieldId,
      resource: capability.resource
    }))
