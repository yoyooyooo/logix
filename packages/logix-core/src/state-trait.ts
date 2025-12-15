// StateTrait 命名空间模块：
// - 提供 traits spec 的 DSL（from/node/list/computed/source/link）；
// - build：归一化 spec 并生成 Program/Graph/Plan；
// - install：将 Program 安装到运行时（注册 source.refresh 等入口，并在事务窗口执行 converge/validate）。

import type { Schema } from "effect"
import { Effect } from "effect"
import type { BoundApi } from "./Bound.js"
import * as Model from "./internal/state-trait/model.js"
import * as FieldPath from "./internal/state-trait/field-path.js"
import * as InternalBuild from "./internal/state-trait/build.js"
import * as InternalInstall from "./internal/state-trait/install.js"

// 对外暴露的核心类型别名。
export type StateTraitSpec<S> = Model.StateTraitSpec<S>
export type StateTraitEntry<S = unknown, P extends string = string> =
  Model.StateTraitEntry<S, P>
export type StateTraitProgram<S> = Model.StateTraitProgram<S>
export type StateTraitGraph = Model.StateTraitGraph
export type StateTraitPlan = Model.StateTraitPlan
export type StateTraitNode<Input = unknown, Ctx = unknown> = Model.StateTraitNode<Input, Ctx>
export type StateTraitList<Item = unknown> = Model.StateTraitList<Item>
export type CheckRule<Input = unknown, Ctx = unknown> = Model.CheckRule<Input, Ctx>

export type StateFieldPath<S> = FieldPath.StateFieldPath<S>
export type StateAtPath<S, P> = FieldPath.StateAtPath<S, P>

export const $root = "$root" as const

/**
 * StateTrait.from：
 * - 根据 State Schema 收窄可用字段路径，并为 traits spec 提供类型约束；
 * - 运行时仅返回原始 spec 对象，具体归一化由 internal 层处理。
 */
export const from = <S extends object, I>(
  _schema: Schema.Schema<S, I>,
) =>
(spec: StateTraitSpec<S>): StateTraitSpec<S> =>
  spec

export const node = <Input = unknown, Ctx = unknown>(
  spec: Omit<Model.StateTraitNode<Input, Ctx>, "_tag">,
): Model.StateTraitNode<Input, Ctx> => ({
  _tag: "StateTraitNode",
  ...spec,
})

export const list = <Item = unknown>(
  spec: Omit<Model.StateTraitList<Item>, "_tag">,
): Model.StateTraitList<Item> => ({
  _tag: "StateTraitList",
  ...spec,
})

/**
 * StateTrait.computed：
 * - 为某个字段声明 computed 能力；
 * - 通过显式 deps 作为唯一依赖事实源（用于诊断/反向闭包/后续增量调度）。
 */
export const computed = <S extends object, P extends StateFieldPath<S>>(
  input: {
    readonly deps: ReadonlyArray<StateFieldPath<S>>
    readonly get: (state: Readonly<S>) => StateAtPath<S, P>
    readonly equals?: (prev: StateAtPath<S, P>, next: StateAtPath<S, P>) => boolean
  },
): StateTraitEntry<S, P> => {
  return {
    fieldPath: undefined as unknown as P,
    kind: "computed",
    meta: { deps: input.deps, derive: input.get, equals: input.equals },
  } as StateTraitEntry<S, P>
}

/**
 * StateTrait.source：
 * - 为某个字段声明外部资源来源（Resource / Query 集成在后续 Phase 中实现）；
 * - 内核负责 keyHash gate / concurrency / ReplayMode 行为。
 */
export const source = <S extends object, P extends StateFieldPath<S>>(meta: {
  resource: string
  deps: ReadonlyArray<StateFieldPath<S>>
  key: (state: Readonly<S>) => unknown
  triggers?: ReadonlyArray<"onMount" | "onValueChange" | "manual">
  debounceMs?: number
  concurrency?: "switch" | "exhaust-trailing"
  /**
   * 用于 Devtools/文档的可序列化元信息（白名单字段会在 build 阶段被提取）。
   */
  meta?: Record<string, unknown>
}): StateTraitEntry<S, P> =>
  ({
    fieldPath: undefined as unknown as P,
    kind: "source",
    meta,
  } as StateTraitEntry<S, P>)

/**
 * StateTrait.link：
 * - 为目标字段声明从其他字段联动的能力；
 * - meta.from 同样受 StateFieldPath<S> 约束。
 */
export const link = <S extends object, P extends StateFieldPath<S>>(meta: {
  from: StateFieldPath<S>
}): StateTraitEntry<S, P> =>
  ({
    fieldPath: undefined as unknown as P,
    kind: "link",
    meta,
  } as StateTraitEntry<S, P>)

/**
 * StateTrait.build：
 * - 将 Spec 归一化为可执行 Program（含 Graph/Plan）；
 * - DSL 层与 build 层的约束以 build 为最终裁决（例如强制显式 deps）。
 */
export const build = <S extends object>(
  stateSchema: Schema.Schema<S, any>,
  spec: StateTraitSpec<S>,
): StateTraitProgram<S> => InternalBuild.build(stateSchema, spec)

/**
 * StateTrait.install：
 * - 在给定 Bound API 上安装 Program 描述的行为（computed/link/source/check 等）；
 * - 每个 PlanStep 对应一个长生命周期 Effect，并挂载到 Runtime Scope。
 */
export const install = <S extends object>(
  bound: BoundApi<any, any>,
  program: StateTraitProgram<S>,
): Effect.Effect<void, never, any> => InternalInstall.install(bound, program)
