import type { Schema } from "effect"
import type { StateAtPath, StateFieldPath } from "./field-path.js"
import * as Meta from "./meta.js"

// StateTrait core model。
// 具体字段语义与 data-model.md / references/state-trait-core.md 保持对齐。

/**
 * StateTraitSpec<S>：
 * - Module 图纸中 traits 槽位的标准形态；
 * - key 受 StateFieldPath<S> 约束，value 为对应 scope 的声明（Entry / Node / List）。
 */
export type StateTraitSpec<S> = S extends object
  ? {
      [Path in StateFieldPath<S> | "$root"]?: StateTraitSpecValue<S, Path>
    }
  : never

export type StateTraitKind = "computed" | "source" | "link" | "check"

export interface ComputedMeta<S, P> {
  /**
   * 显式依赖字段路径集合（必须）：
   *
   * - 对于 Root 规则：deps 为 StateFieldPath<State>；
   * - 对于 list.item scope：deps 为 StateFieldPath<Item>（相对路径，build 阶段会前缀化）。
   */
  readonly deps: ReadonlyArray<StateFieldPath<S>>
  readonly derive: (state: Readonly<S>) => StateAtPath<S, P>
  /**
   * 可选：等价判定（用于跳过无变化写回）。
   */
  readonly equals?: (prev: StateAtPath<S, P>, next: StateAtPath<S, P>) => boolean
}

export interface SourceMeta<S, P> {
  readonly deps: ReadonlyArray<StateFieldPath<S>>
  /**
   * 逻辑资源标识（如 "user/profile"）。
   *
   * - StateTrait.source DSL 中的 `resource` 字段在 build 阶段会落在此处；
   * - data-model.md 中记为 resourceId，这里沿用 DSL 命名避免混淆。
   */
  readonly resource: string
  /**
   * 从完整 State 计算访问该资源所需 key 的规则。
   *
   * - 允许返回 undefined：表示该资源在当前 state 下未激活（应回收为 idle）。
   */
  readonly key: (state: Readonly<S>) => unknown
  readonly triggers?: ReadonlyArray<"onMount" | "onValueChange" | "manual">
  readonly debounceMs?: number
  readonly concurrency?: "switch" | "exhaust-trailing"
  /**
   * 用于 Devtools/文档的可序列化元信息（白名单字段）。
   */
  readonly meta?: Meta.TraitMeta
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

export type CheckRule<Input = unknown, Ctx = unknown> =
  {
    readonly deps: ReadonlyArray<string>
    readonly validate: (input: Input, ctx: Ctx) => unknown
    readonly meta?: Meta.TraitMeta
  }

export interface CheckMeta<Input = unknown, Ctx = unknown> {
  /**
   * 命名规则集合（记录用于确定性合并与诊断展示）。
   */
  readonly rules: Readonly<Record<string, CheckRule<Input, Ctx>>>
  /**
   * 错误树写回（Phase 2：仅固化结构；具体写回语义在后续 Phase 实现）。
   */
  readonly writeback?: {
    readonly kind: "errors"
    readonly path?: string
  }
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
  | {
      readonly fieldPath: P
      readonly kind: "check"
      readonly meta: CheckMeta<unknown, unknown>
    }

export interface StateTraitNode<Input = unknown, Ctx = unknown> {
  readonly _tag: "StateTraitNode"
  readonly computed?:
    | StateTraitEntry<Input, any>
    | Readonly<Record<string, StateTraitEntry<Input, any>>>
  readonly source?:
    | StateTraitEntry<Input, any>
    | Readonly<Record<string, StateTraitEntry<Input, any>>>
  readonly link?:
    | StateTraitEntry<Input, any>
    | Readonly<Record<string, StateTraitEntry<Input, any>>>
  readonly check?: Readonly<Record<string, CheckRule<Input, Ctx>>>
  readonly meta?: Meta.TraitMeta
}

export interface StateTraitList<Item = unknown> {
  readonly _tag: "StateTraitList"
  readonly item?: StateTraitNode<Item, any>
  readonly list?: StateTraitNode<ReadonlyArray<Item>, any>
  readonly identityHint?: {
    readonly trackBy?: string
  }
}

export type StateTraitSpecValue<S, P extends string> =
  | StateTraitEntry<S, P>
  | StateTraitNode<any, any>
  | StateTraitList<any>

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
    | CheckMeta<unknown, unknown>
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
  readonly meta?: Meta.TraitMeta
  readonly metaOrigin?: string
  readonly metaConflicts?: ReadonlyArray<Meta.TraitMetaConflict>
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
  readonly meta?: Meta.TraitMeta
}

export interface StateTraitGraphEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: "computed" | "link" | "source-dep" | "check-dep"
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
  readonly kind: "computed-update" | "link-propagate" | "source-refresh" | "check-validate"
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
  /**
   * Program.entries：
   * - build 阶段从 spec（含 node/list/$root）归一化得到的最小规则集合；
   * - Phase 2 先保证“可读可诊断的结构”，后续 Phase 才接入执行与收敛语义。
   */
  readonly entries: ReadonlyArray<StateTraitEntry<any, string>>
  readonly graph: StateTraitGraph
  readonly plan: StateTraitPlan
}

/**
 * 从 StateTraitSpec 构建归一化的 entry 列表。
 *
 * - Phase 2：支持 node/list/$root 的结构展开，并在必要时补全/前缀化 fieldPath 与 deps；
 * - 后续 Phase 可在此处扩展校验逻辑（例如检测重复定义、覆盖机制等）。
 */
export const normalizeSpec = <S>(
  spec: StateTraitSpec<S>,
): ReadonlyArray<StateTraitEntry<any, string>> => {
  const entries: Array<StateTraitEntry<any, string>> = []

  const isNode = (value: unknown): value is StateTraitNode<any, any> =>
    typeof value === "object" && value !== null && (value as any)._tag === "StateTraitNode"

  const isList = (value: unknown): value is StateTraitList<any> =>
    typeof value === "object" && value !== null && (value as any)._tag === "StateTraitList"

  const joinPath = (prefix: string, suffix: string): string => {
    if (!prefix) return suffix
    if (!suffix) return prefix
    return `${prefix}.${suffix}`
  }

  const prefixDeps = (
    deps: ReadonlyArray<string> | undefined,
    prefix: string,
  ): ReadonlyArray<string> => {
    if (!deps || deps.length === 0) return []
    return deps.map((d) => (prefix ? joinPath(prefix, d) : d))
  }

  const normalizeEntry = (
    entry: StateTraitEntry<any, string>,
    fieldPath: string,
    depPrefix: string,
  ): StateTraitEntry<any, string> => {
    if (entry.kind === "computed") {
      const meta = entry.meta as any
      const rawDeps = meta.deps as ReadonlyArray<string> | undefined
      const deps =
        rawDeps !== undefined
          ? prefixDeps(rawDeps, depPrefix)
          : undefined
      return {
        ...(entry as any),
        fieldPath,
        meta: { ...meta, deps },
      }
    }
    if (entry.kind === "source") {
      const meta = entry.meta as any
      const rawDeps = meta.deps as ReadonlyArray<string> | undefined
      const deps =
        rawDeps !== undefined
          ? prefixDeps(rawDeps, depPrefix)
          : undefined
      return {
        ...(entry as any),
        fieldPath,
        meta: { ...meta, deps, _fieldPath: fieldPath },
      }
    }
    if (entry.kind === "link") {
      const meta = entry.meta as any
      const from = prefixDeps([meta.from as string], depPrefix)[0] ?? meta.from
      return {
        ...(entry as any),
        fieldPath,
        meta: { ...meta, from },
      }
    }
    // check：Phase 2 仅调整 fieldPath，deps 仍由 meta.rules 在 build 阶段汇总。
    return {
      ...(entry as any),
      fieldPath,
    }
  }

  const expandNode = (
    scopeId: string,
    joinPrefix: string,
    node: StateTraitNode<any, any>,
  ): void => {
    const addEntry = (relativeTarget: string, raw: StateTraitEntry<any, string>): void => {
      const rel = (raw as any).fieldPath ?? relativeTarget
      const fieldPath = joinPrefix ? joinPath(joinPrefix, String(rel)) : String(rel)
      entries.push(normalizeEntry(raw, fieldPath, joinPrefix))
    }

    const expandMaybeRecord = (
      value:
        | StateTraitEntry<any, any>
        | Readonly<Record<string, StateTraitEntry<any, any>>>
        | undefined,
    ): void => {
      if (!value) return
      if (typeof (value as any).kind === "string") {
        addEntry("", value as any)
        return
      }
      const record = value as Readonly<Record<string, StateTraitEntry<any, any>>>
      for (const key in record) {
        if (!Object.prototype.hasOwnProperty.call(record, key)) continue
        const entry = record[key]
        if (!entry) continue
        addEntry(key, entry as any)
      }
    }

    expandMaybeRecord(node.computed)
    expandMaybeRecord(node.source)
    expandMaybeRecord(node.link)

    if (node.check) {
      const rules: Record<string, CheckRule<any, any>> = {}
      for (const name of Object.keys(node.check)) {
        const rule = (node.check as any)[name] as CheckRule<any, any>
        if (typeof rule === "function") {
          rules[name] = rule
          continue
        }
        if (rule && typeof rule === "object") {
          const meta = Meta.sanitize((rule as any).meta)
          rules[name] = {
            ...rule,
            deps: prefixDeps(rule.deps, joinPrefix),
            meta,
          }
          continue
        }
        // 非法输入：忽略（后续 Phase 将在 build 阶段提升为配置错误）。
      }

      entries.push({
        fieldPath: scopeId,
        kind: "check",
        meta: {
          rules,
          writeback: { kind: "errors" },
        },
      } as StateTraitEntry<any, any>)
    }
  }

  for (const key in spec) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) continue
    const raw = spec[key as keyof typeof spec] as StateTraitSpecValue<S, any> | undefined
    if (!raw) continue

    if (isList(raw)) {
      const listPath = key
      if (raw.item) {
        expandNode(`${listPath}[]`, `${listPath}[]`, raw.item)
      }
      if (raw.list) {
        expandNode(listPath, listPath, raw.list)
      }
      continue
    }

    if (isNode(raw)) {
      if (key === "$root") {
        expandNode("$root", "", raw)
      } else {
        expandNode(key, key, raw)
      }
      continue
    }

    const entry = raw as any as StateTraitEntry<any, string>
    const fieldPath = (entry as any).fieldPath ?? key
    entries.push(normalizeEntry(entry, String(fieldPath), ""))
  }

  return entries
}

/**
 * collectNodeMeta：
 * - 从 StateTraitSpec 中提取 StateTraitNode.meta（白名单字段），供 Devtools 进行结构展示；
 * - meta 仅用于诊断与展示，不参与运行时语义。
 */
export const collectNodeMeta = <S>(
  spec: StateTraitSpec<S>,
): ReadonlyMap<string, Meta.TraitMeta> => {
  const out = new Map<string, Meta.TraitMeta>()

  const isNode = (value: unknown): value is StateTraitNode<any, any> =>
    typeof value === "object" && value !== null && (value as any)._tag === "StateTraitNode"

  const isList = (value: unknown): value is StateTraitList<any> =>
    typeof value === "object" && value !== null && (value as any)._tag === "StateTraitList"

  const add = (scopeId: string, node: StateTraitNode<any, any>): void => {
    const meta = Meta.sanitize(node.meta)
    if (meta) out.set(scopeId, meta)
  }

  for (const key in spec) {
    if (!Object.prototype.hasOwnProperty.call(spec, key)) continue
    const raw = spec[key as keyof typeof spec] as StateTraitSpecValue<S, any> | undefined
    if (!raw) continue

    if (isList(raw)) {
      const listPath = key
      if (raw.item) add(`${listPath}[]`, raw.item)
      if (raw.list) add(listPath, raw.list)
      continue
    }

    if (isNode(raw)) {
      if (key === "$root") add("$root", raw)
      else add(key, raw)
      continue
    }
  }

  return out
}
