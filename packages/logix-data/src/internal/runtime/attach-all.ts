import type { FieldCapability } from "../model/capability.js"
import { buildComputedPlan, type ComputedRuntimePlan } from "./attach-computed.js"
import { buildSourcePlan, type SourceRuntimePlan } from "./attach-source.js"
import { buildLinkPlan, type LinkRuntimePlan } from "./attach-link.js"

export interface ModuleRuntimePlan {
  readonly moduleId: string
  readonly computed: ReadonlyArray<ComputedRuntimePlan>
  readonly source: ReadonlyArray<SourceRuntimePlan>
  readonly link: ReadonlyArray<LinkRuntimePlan>
}

/**
 * 基于 FieldCapability 集合构建模块级的运行时计划。
 * 上层 Runtime 可以使用这些计划生成具体的 Effect/Flow。
 */
export const buildModuleRuntimePlan = (params: {
  moduleId: string
  capabilities: ReadonlyArray<FieldCapability>
}): ModuleRuntimePlan => ({
  moduleId: params.moduleId,
  computed: buildComputedPlan(params.capabilities),
  source: buildSourcePlan(params.capabilities),
  link: buildLinkPlan(params.capabilities)
})
