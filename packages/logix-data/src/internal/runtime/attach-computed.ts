import type { FieldCapability } from "../model/capability.js"

export interface ComputedRuntimePlan {
  readonly fieldId: string
  readonly deps: ReadonlyArray<string>
}

/**
 * 从 FieldCapability 集合中提取 Computed 能力的运行时计划。
 * 这里不直接绑定具体 Runtime/Effect，只描述依赖关系，供上层挂接。
 */
export const buildComputedPlan = (
  capabilities: ReadonlyArray<FieldCapability>
): ReadonlyArray<ComputedRuntimePlan> =>
  capabilities
    .filter((capability) => capability.kind === "Computed")
    .map((capability) => ({
      fieldId: capability.fieldId,
      deps: capability.deps ?? []
    }))
