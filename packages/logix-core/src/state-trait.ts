// StateTrait 命名空间占位模块（Phase 3）。
// - 连接 internal/state-trait 下的类型与占位实现；
// - 提供 from/computed/source/link 的最小 DSL 形态（仅限类型与结构），
//   具体 Program/Graph/Plan 与 install 行为在后续 Phase 中按 spec 补全。

import type { Schema } from "effect"
import { Effect } from "effect"
import type { BoundApi } from "./Bound.js"
import * as Model from "./internal/state-trait/model.js"
import * as FieldPath from "./internal/state-trait/field-path.js"
import * as InternalBuild from "./internal/state-trait/build.js"
import * as InternalInstall from "./internal/state-trait/install.js"

// 对外暴露的核心类型别名（Phase 3 占位版本）。
export type StateTraitSpec<S> = Model.StateTraitSpec<S>
export type StateTraitEntry<S = unknown, P extends string = string> =
  Model.StateTraitEntry<S, P>
export type StateTraitProgram<S> = Model.StateTraitProgram<S>
export type StateTraitGraph = Model.StateTraitGraph
export type StateTraitPlan = Model.StateTraitPlan

export type StateFieldPath<S> = FieldPath.StateFieldPath<S>
export type StateAtPath<S, P> = FieldPath.StateAtPath<S, P>

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

/**
 * StateTrait.computed：
 * - 为某个字段声明 computed 能力；
 * - Phase 3 中仅在 meta 中保留 derive 函数，fieldPath 在 normalize 阶段补全。
 */
export const computed = <S extends object, P extends StateFieldPath<S>>(
  derive: (state: Readonly<S>) => StateAtPath<S, P>,
): StateTraitEntry<S, P> =>
  ({
    fieldPath: undefined as unknown as P,
    kind: "computed",
    meta: { derive },
  } as StateTraitEntry<S, P>)

/**
 * StateTrait.source：
 * - 为某个字段声明外部资源来源（Resource / Query 集成在后续 Phase 中实现）；
 * - 当前仅在 meta 中保留 resourceId 与 key 规则。
 */
export const source = <S extends object, P extends StateFieldPath<S>>(meta: {
  resource: string
  key: (state: Readonly<S>) => unknown
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
 * StateTrait.build 占位导出：
 * - 当前仅委托 internal/state-trait/build.ts，内部实现仍为未实现占位；
 * - 具体构建逻辑在后续 Phase 中实现。
 */
export const build = <S extends object>(
  stateSchema: Schema.Schema<S, any>,
  spec: StateTraitSpec<S>,
): StateTraitProgram<S> => InternalBuild.build(stateSchema, spec)

/**
 * StateTrait.install 占位导出：
 * - 当前仅委托 internal/state-trait/install.ts，占位实现总是抛出未实现错误；
 * - 具体安装逻辑在后续 Phase 中实现。
 */
export const install = <S extends object>(
  bound: BoundApi<any, any>,
  program: StateTraitProgram<S>,
): Effect.Effect<void, never, any> => InternalInstall.install(bound, program)
