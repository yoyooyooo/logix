import type { FieldCapability } from "../model/capability.js"

export interface LinkRuntimePlan {
  readonly fieldId: string
  readonly deps: ReadonlyArray<string>
  readonly direction: "one-way" | "two-way" | undefined
}

/**
 * 从 FieldCapability 集合中提取 Link 能力的运行时计划。
 */
export const buildLinkPlan = (
  capabilities: ReadonlyArray<FieldCapability>
): ReadonlyArray<LinkRuntimePlan> =>
  capabilities
    .filter((capability) => capability.kind === "Link")
    .map((capability) => ({
      fieldId: capability.fieldId,
      deps: capability.deps ?? [],
      direction: capability.direction
    }))
