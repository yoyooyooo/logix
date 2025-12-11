import type { Schema } from "effect"
import type { StateAtPath, StateFieldPath } from "./field-path.js"

// StateTrait core model。
// 具体字段语义与 data-model.md / references/state-trait-core.md 保持对齐。

/**
 * StateTraitSpec<S>：
 * - Module 图纸中 traits 槽位的标准形态；
 * - key 受 StateFieldPath<S> 约束，value 为对应字段上的 StateTraitEntry。
 */
export type StateTraitSpec<S> = S extends object
  ? { [Path in StateFieldPath<S>]?: StateTraitEntry<S, Path> }
  : never

export type StateTraitKind = "computed" | "source" | "link"

export interface ComputedMeta<S, P> {
  readonly derive: (state: Readonly<S>) => StateAtPath<S, P>
}

export interface SourceMeta<S, P> {
  /**
   * 逻辑资源标识（如 "user/profile"）。
   *
   * - StateTrait.source DSL 中的 `resource` 字段在 build 阶段会落在此处；
   * - data-model.md 中记为 resourceId，这里沿用 DSL 命名避免混淆。
   */
  readonly resource: string
  /**
   * 从完整 State 计算访问该资源所需 key 的规则。
   */
  readonly key: (state: Readonly<S>) => unknown
  /**
   * 预留：在 build 阶段可填充该 Trait 所在字段路径，便于调试。
   */
  readonly _fieldPath?: P
}

export interface LinkMeta<S> {
  /**
   * 源字段路径，同样受 StateFieldPath<S> 约束。
   */
  readonly from: StateFieldPath<S>
}

/**
 * StateTraitEntry<S, P>：
 * - 表示某个字段路径 P 上的一项 Trait 配置；
 * - kind 与 meta 成对出现，用于在 build/install 阶段分派行为。
 */
export type StateTraitEntry<
  S = unknown,
  P extends string = StateFieldPath<S>
> =
  | {
      readonly fieldPath: P
      readonly kind: "computed"
      readonly meta: ComputedMeta<S, P>
    }
  | {
      readonly fieldPath: P
      readonly kind: "source"
      readonly meta: SourceMeta<S, P>
    }
  | {
      readonly fieldPath: P
      readonly kind: "link"
      readonly meta: LinkMeta<S>
    }

/**
 * StateTraitField：
 * - 表示 State 中的一个字段节点（不论是否挂 Trait）；
 * - 由 build 阶段从 StateTraitSpec 归一化而来。
 */
export interface StateTraitField {
  readonly id: string
  readonly path: string
  readonly displayName?: string
  readonly valueType?: string
  readonly traits: ReadonlyArray<StateTraitFieldTrait>
}

/**
 * StateTraitFieldTrait：
 * - 某个字段上的一项 Trait（computed / source / link）的结构化描述；
 * - meta 与 StateTraitEntry.meta 对齐，deps 表示该 Trait 所依赖的字段路径集合。
 */
export interface StateTraitFieldTrait {
  readonly fieldId: string
  readonly kind: StateTraitKind
  readonly meta:
    | ComputedMeta<unknown, string>
    | SourceMeta<unknown, string>
    | LinkMeta<unknown>
  readonly deps: ReadonlyArray<string>
}

/**
 * StateTraitResource：
 * - 描述 source 型 Trait 所依赖的逻辑资源元信息；
 * - ResourceSpec 的具体实现由 Resource 命名空间负责，这里只保留 Trait 视角的依赖信息。
 */
export interface StateTraitResource {
  readonly resourceId: string
  readonly keySelector: string
  readonly keyExample?: unknown
  readonly ownerFields: ReadonlyArray<string>
}

/**
 * Graph Node / Edge：
 * - 节点通常对应一个字段；
 * - 边表示字段之间或字段与资源之间的依赖关系。
 */
export interface StateTraitGraphNode {
  readonly id: string
  readonly field: StateTraitField
  readonly traits: ReadonlyArray<StateTraitFieldTrait>
  readonly meta?: Record<string, unknown>
}

export interface StateTraitGraphEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: "computed" | "link" | "source-dep"
}

/**
 * StateTraitGraph：
 * - StateTrait 引擎的结构视图，一张包含节点与依赖边的图；
 * - 供 Devtools / Studio 与 Runtime 做结构分析与可视化使用。
 */
export interface StateTraitGraph {
  readonly _tag: "StateTraitGraph"
  readonly nodes: ReadonlyArray<StateTraitGraphNode>
  readonly edges: ReadonlyArray<StateTraitGraphEdge>
  readonly resources: ReadonlyArray<StateTraitResource>
  readonly meta?: {
    readonly moduleId?: string
    readonly version?: string
  }
}

/**
 * StateTraitPlanStep：
 * - StateTrait.install / Runtime 执行时的最小指令单元；
 * - 由 Graph 推导而来，用于在运行时安装 watcher 或触发外部调用。
 */
export interface StateTraitPlanStep {
  readonly id: string
  readonly kind: "computed-update" | "link-propagate" | "source-refresh"
  readonly targetFieldPath?: string
  readonly sourceFieldPaths?: ReadonlyArray<string>
  readonly resourceId?: string
  readonly keySelectorId?: string
  readonly debugInfo?: {
    readonly graphNodeId?: string
    readonly graphEdgeId?: string
  }
}

/**
 * StateTraitPlan：
 * - 汇总某模块所有 Trait 行为的执行计划；
 * - install 阶段按 Plan 将行为挂载到 Bound API / EffectOp 管道上。
 */
export interface StateTraitPlan {
  readonly _tag: "StateTraitPlan"
  readonly moduleId?: string
  readonly steps: ReadonlyArray<StateTraitPlanStep>
  readonly meta?: Record<string, unknown>
}

/**
 * StateTraitProgram<S>：
 * - StateTrait 引擎的 Program 输出，是 Runtime / Devtools 的统一入口；
 * - stateSchema 与 spec 保留原始输入，graph/plan 为内部 IR。
 */
export interface StateTraitProgram<S> {
  readonly stateSchema: Schema.Schema<S, any>
  readonly spec: StateTraitSpec<S>
  readonly graph: StateTraitGraph
  readonly plan: StateTraitPlan
}

/**
 * 从 StateTraitSpec 构建归一化的 entry 列表。
 *
 * - Phase 3：只负责将「路径 → Entry」展开为数组，并在必要时补全 fieldPath 字段；
 * - 后续 Phase 可在此处扩展校验逻辑（例如检测重复定义等）。
 */
export const normalizeSpec = <S>(
  spec: StateTraitSpec<S>,
): ReadonlyArray<StateTraitEntry<S, StateFieldPath<S>>> => {
  const entries: Array<StateTraitEntry<S, StateFieldPath<S>>> = []

  for (const key in spec) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) continue
    const raw = spec[key as keyof typeof spec] as
      | StateTraitEntry<S, StateFieldPath<S>>
      | undefined
    if (!raw) continue

    const fieldPath = (raw as any).fieldPath ?? key
    entries.push({
      ...(raw as object),
      fieldPath,
    } as StateTraitEntry<S, StateFieldPath<S>>)
  }

  return entries
}
