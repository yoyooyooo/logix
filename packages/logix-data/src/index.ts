// Public entrypoint for @logix/data
// ⚠️ Archived / PoC only:
// 当前主线已经由 @logix/core 内部的 StateTrait 模块统一承载字段能力与 State Graph。
// 本包仅保留用于回顾早期实现与实验代码，不应在新的模块或仓库中新增依赖。

export { Computed } from "./computed/schema.js"
export { Source } from "./source/schema.js"
export { Link } from "./link/schema.js"

export type { Field } from "./internal/model/field.js"
export type {
  FieldCapability,
  FieldCapabilityKind
} from "./internal/model/capability.js"
export type { ResourceMetadata } from "./internal/model/resource.js"
export type {
  StateGraph,
  GraphNode,
  GraphEdge
} from "./internal/model/state-graph.js"
