import { Effect, Layer, Schema } from "effect"
import { create } from "mutative"
import * as Logic from "./Logic.js"
import * as ModuleFactory from "./internal/runtime/ModuleFactory.js"
import type {
  ActionsFromMap,
  AnyModuleShape,
  AnySchema,
  BoundApi,
  ActionOf,
  ModuleImpl,
  ModuleInstance,
  ModuleLogic,
  ModuleShape,
  ModuleRuntime,
  ModuleTag,
  ModuleHandle,
  ModuleHandleUnion,
  ReducersFromMap,
  StateOf,
} from "./internal/module.js"
import * as StateTrait from "./state-trait.js"
import type { StateTraitProgram } from "./state-trait.js"
import * as ModuleTraitsRegistry from "./internal/debug/ModuleTraitsRegistry.js"

/**
 * Module / ModuleRuntime / ModuleImpl 等核心类型定义的公开出口。
 *
 * 与 docs/specs/runtime-logix/core/02-module-and-logic-api.md 保持对齐。
 * 具体类型定义集中在 internal/module.ts 中，本模块负责组合工厂实现。
 */
export type {
  AnySchema,
  AnyModuleShape,
  ModuleShape,
  ModuleLogic,
  ModuleInstance,
  ModuleImpl,
  ModuleRuntime,
  ModuleTag,
  ModuleHandle,
  ModuleHandleUnion,
  StateOf,
  ActionsFromMap,
  ReducersFromMap,
  BoundApi,
  ActionOf,
} from "./internal/module.js"

/**
 * Reducer 帮助工具：
 * - `Reducer.mutate` 提供与 `$.state.mutate` 一致的 mutative 风格写法；
 * - 通过内部基于 mutative 的不可变更新，将「就地修改 draft」映射为纯 `(state, action) => state` 函数。
 *
 * 用法示例：
 *
 *   const Counter = Logix.Module.make("Counter", {
 *     state: CounterState,
 *     actions: CounterActions,
 *     reducers: {
 *       inc: Logix.Module.Reducer.mutate((draft, _action) => {
 *         draft.count += 1
 *       }),
 *     },
 *   })
 *
 *   yield* $.reducer(
 *     "setValue",
 *     Logix.Module.Reducer.mutate((draft, action) => {
 *       draft.value = action.payload
 *     }),
 *   )
 */
export const Reducer = {
  mutate: <S, A>(
    mutator: (draft: Logic.Draft<S>, action: A) => void
  ): ((state: S, action: A) => S) =>
    (state, action) =>
      create(state as S, (draft) => {
        mutator(draft as Logic.Draft<S>, action)
      }) as S,
}

/**
 * 简化的 Shape 定义助手，专为 Action Map 设计。
 * @example type MyShape = Shape<typeof MyState, typeof MyActionMap>
 */
export type Shape<
  S extends AnySchema,
  M extends Record<string, AnySchema>
> = ModuleShape<S, Schema.Schema<ActionsFromMap<M>>, M>

const makeImpl = <
  Id extends string,
  SSchema extends AnySchema,
  AMap extends Record<string, AnySchema>
>(
  id: Id,
  def: {
    readonly state: SSchema
    readonly actions: AMap
    readonly reducers?: ReducersFromMap<SSchema, AMap>
  }
): ModuleInstance<
  Id,
  ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>
> => ModuleFactory.Module(id, def) as ModuleInstance<
  Id,
  ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>
>

/**
 * Module.make：
 * - 以给定 id 与 state/actions/reducers 定义一个领域模块；
 * - 返回的 ModuleInstance 既是 Context.Tag，又携带 Shape 与工厂能力。
 *
 * 典型用法：
 *
 *   const Counter = Logix.Module.make("Counter", {
 *     state: CounterState,
 *     actions: CounterActions,
 *   })
 */
export const make = <
  Id extends string,
  SSchema extends AnySchema,
  AMap extends Record<string, AnySchema>
>(
  id: Id,
  def: {
    readonly state: SSchema
    readonly actions: AMap
    readonly reducers?: ReducersFromMap<SSchema, AMap>
    /**
     * 预留：traits 槽位用于挂载 StateTraitSpec（详见 specs/001-module-traits-runtime）。
     * - 当前 Phase 仅在类型层允许该字段存在，运行时实现尚未消费；
     * - 后续 Phase 将在 ModuleImpl / Runtime 中识别并接入 StateTraitProgram 与 install 逻辑。
     */
    readonly traits?: unknown
  }
): ModuleInstance<
  Id,
  ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>
> => {
  const moduleInstance = makeImpl(id, def)

  // 若未提供 traits 槽位，直接返回基础 Module 实例。
  if (!def.traits) {
    return moduleInstance
  }

  // 基于 Module 定义构造 StateTraitProgram：
  // - S 视为 stateSchema 的输出类型；
  // - traits 视为 StateTraitSpec<S>（调用方通过 StateTrait.from 收窄路径与类型）。
  type S = Schema.Schema.Type<SSchema>

  const stateSchema = def.state as Schema.Schema<any, any>
  const traitsSpec = def.traits as StateTrait.StateTraitSpec<any>

  const program = StateTrait.build(stateSchema as any, traitsSpec as any)

  // 注册到 Debug/Devtools 用的全局索引，便于按 moduleId 查询 StateTraitProgram。
  ModuleTraitsRegistry.registerModuleProgram(id, program as StateTraitProgram<any>)

  // 将 Program 挂在 Module 实例上，供后续 Debug/Devtools 读取。
  ;(moduleInstance as any).__stateTraitProgram = program

  // 封装一个内部 Logic，用于在 Runtime 初始化阶段安装 StateTrait 行为。
  const makeTraitLogic = (): ModuleLogic<
    ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>,
    never,
    never
  > =>
    moduleInstance.logic(($) =>
      StateTrait.install($ as unknown as BoundApi<any, any>, program),
    ) as ModuleLogic<
      ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>,
      never,
      never
    >

  // 包装 implement：同样在实现层自动注入 StateTrait 安装逻辑。
  const originalImplement = moduleInstance.implement
  ;(moduleInstance as any).implement = (<R = never>(config: {
    initial: StateOf<typeof moduleInstance.shape>
    logics?: Array<ModuleLogic<typeof moduleInstance.shape, R, any>>
    imports?: ReadonlyArray<
      Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>
    >
    processes?: ReadonlyArray<Effect.Effect<void, any, any>>
  }) => {
    const traitLogic = makeTraitLogic() as ModuleLogic<
      typeof moduleInstance.shape,
      R,
      any
    >
    const mergedLogics = config.logics
      ? [traitLogic, ...config.logics]
      : [traitLogic]
    return originalImplement<R>({
      ...config,
      logics: mergedLogics,
    })
  }) as typeof moduleInstance.implement

  return moduleInstance
}
