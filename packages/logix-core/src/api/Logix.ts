import { Context, Effect, Layer, Schema, Stream, SubscriptionRef } from "effect"
import * as Logic from "./Logic.js"
import * as ModuleFactory from "../runtime/ModuleFactory.js"

export type BoundApi<Sh extends AnyModuleShape, R = never> =
  import("./BoundApi.js").BoundApi<Sh, R>

// ---------------------------------------------------------------------------
// Store：以 Schema 为事实源的 State / Action 形状 + 运行时能力
// ---------------------------------------------------------------------------

/**
 * 方便约束：任意 Effect Schema。
 * 使用 any 以绕过 Schema 的不变性（Invariance）约束，
 * 确保 ModuleShape<SpecificSchema> 可以 extends AnyModuleShape。
 */
export type AnySchema = any

/**
 * 一类 Module 的「Schema 形状」：只关心 stateSchema / actionSchema，
 * 不关心运行时配置细节（initialState / services / logic 等）。
 *
 * 在业务代码中，通常是：
 *
 *   const stateSchema  = Schema.Struct({ ... })
 *   const actionSchema = Schema.Union(...)
 *
 *   type CounterShape = ModuleShape<typeof stateSchema, typeof actionSchema>
 */
export interface ModuleShape<
  SSchema extends AnySchema,
  ASchema extends AnySchema,
  AMap extends Record<string, AnySchema> = Record<string, never>
> {
  readonly stateSchema: SSchema
  readonly actionSchema: ASchema
  readonly actionMap: AMap
}

/**
 * 方便约束：任意 ModuleShape。
 */
export type AnyModuleShape = ModuleShape<any, any, any>

export type StateOf<Sh extends AnyModuleShape> = Schema.Schema.Type<
  Sh["stateSchema"]
>

export type ActionOf<Sh extends AnyModuleShape> = Schema.Schema.Type<
  Sh["actionSchema"]
>

/**
 * v3：强类型 Module Tag，用于在 Logic.forShape / 协作逻辑中进行类型安全约束。
 *
 * 说明：
 * - Id 类型对本 PoC 不重要，因此统一使用 `any`；
 * - Service 类型固定为当前 Shape 对应的 Runtime。
 */
export type ModuleTag<Sh extends AnyModuleShape> = Context.Tag<
  any,
  ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
>

/**
 * Module 句柄（ModuleHandle）：
 * - 在 React Adapter / 上层集成中，用于统一接收「Tag 或运行时实例」两种形态；
 * - 作为 Env/DI：通常使用 ModuleTag<Sh> 放入 Layer / Runtime 环境；
 * - 作为局部持有：通常使用运行时实例直接在组件或逻辑中传递。
 *
 * 上层 API 可以接受 ModuleHandle<Sh>，在内部区分 Tag / 实例实际类型。
 */
export type ModuleHandleUnion<Sh extends AnyModuleShape> =
  | ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
  | ModuleTag<Sh>

/**
 * v3：跨 Module 访问时暴露给 Logic 的「只读句柄」视图。
 *
 * - read：基于 selector 读取快照值；
 * - changes：订阅 selector 对应视图的变化；
 * - dispatch：向该 Module 派发 Action；
 *
 * 运行时可以基于 Runtime 封装实现，但类型上不暴露任何直接写 State 的接口。
 */
export interface ModuleHandle<Sh extends AnyModuleShape> {
  readonly read: <V>(
    selector: (s: StateOf<Sh>) => V
  ) => Effect.Effect<V, never, never>
  readonly changes: <V>(
    selector: (s: StateOf<Sh>) => V
  ) => Stream.Stream<V, never, never>
  readonly dispatch: (
    action: ActionOf<Sh>
  ) => Effect.Effect<void, never, never>
  readonly actions: {
    [K in keyof Sh["actionMap"]]: (
      payload: Schema.Schema.Type<Sh["actionMap"][K]>
    ) => Effect.Effect<void, never, never>
  }
  readonly actions$: Stream.Stream<ActionOf<Sh>, never, never>
}

/**
 * Module 的运行时接口（类似文档中的「Store as Context」），
 * 对 Logic / Flow 暴露读写、订阅与派发能力。
 */
export interface ModuleRuntime<S, A> {
  readonly id?: string
  // ----- State -----
  readonly getState: Effect.Effect<S>
  readonly setState: (next: S) => Effect.Effect<void>

  // ----- Actions -----
  readonly dispatch: (action: A) => Effect.Effect<void>
  readonly actions$: Stream.Stream<A>

  // ----- 衍生源 / 工具 -----
  /**
   * 订阅某个 selector 的变化。
   * 说明：实现上可以基于 state$ + distinctUntilChanged。
   */
  readonly changes: <V>(selector: (s: S) => V) => Stream.Stream<V>

  /**
   * 提供一个 SubscriptionRef，用于长逻辑 / 细粒度逻辑直接借用状态。
   * 当前实现仅暴露整棵 State 的 Ref，selector 视图需调用方自行封装。
   */
  readonly ref: {
    <V = S>(selector?: (s: S) => V): SubscriptionRef.SubscriptionRef<V>
  }
}

// ----- 与 docs/specs/runtime-logix/core/02-module-and-logic-api.md 对齐的 API 形状 -----
// 这里用类型占位的“Layer 形状”来模拟 State / Action 的 Layer，
// 同时展示它们如何与一组 Logic 程序一起被 ModuleRuntime.make 组合。

export namespace State {
  // 提供 State.Tag<S>，不再额外依赖环境
  export type Layer<S> = Layer.Layer<State.Tag<S>, never, never>
  export type Tag<S> = Context.Tag<any, S>
}

export namespace Actions {
  // 提供 Actions.Tag<A>，不再额外依赖环境
  export type Layer<A> = Layer.Layer<Actions.Tag<A>, never, never>
  export type Tag<A> = Context.Tag<
    any,
    { dispatch: (a: A) => Effect.Effect<void>; actions$: Stream.Stream<A> }
  >
}

/**
 * ModuleLogic：在某一类 Module 上运行的一段逻辑程序。
 *
 * - 约定 Env 为 Logic.Env<Sh,R>；
 * - 返回值统一视为 void，错误与依赖通过 E/R 表达。
 */
export type ModuleLogic<
  Sh extends AnyModuleShape,
  R = unknown,
  E = never
> = Logic.Of<Sh, R, unknown, E>

/**
 * ModuleInstance：领域模块定义对象。
 *
 * - 同时充当 Context.Tag，可作为 `$.use(Module)` 的参数；
 * - 暴露 logic / live 两个工厂，用于挂载 Logic 程序与构造 Live Layer。
 */
export interface ModuleInstance<
  Id extends string,
  Sh extends AnyModuleShape
> extends Context.Tag<
    any,
    ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>
  > {
  readonly _kind: "Module"
  readonly id: Id
  readonly shape: Sh
  readonly stateSchema: Sh["stateSchema"]
  readonly actionSchema: Sh["actionSchema"]

  readonly logic: <R = unknown, E = never>(
    build: (
      api: import("./BoundApi.js").BoundApi<Sh, R>
    ) => ModuleLogic<Sh, R, E>
  ) => ModuleLogic<Sh, R, E>

  readonly live: <R = never, E = never>(
    initial: StateOf<Sh>,
    ...logics: Array<ModuleLogic<Sh, R, E>>
  ) => Layer.Layer<
    ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
    E,
    R
  >

  readonly make: <R = never>(
    config: {
      initial: StateOf<Sh>
      logics?: Array<ModuleLogic<Sh, R, never>>
      /**
       * imports：在生成 ModuleImpl 时一并引入的依赖。
       *
       * - 可以是任意 Layer（例如 Service / 平台能力）；
       * - 也可以是其他 ModuleImpl（例如 UserImpl 依赖 AuthImpl）。
       *
       * 实现上会在 ModuleImpl.layer 内部通过 withLayer/withLayers 叠加这些 imports，
       * 确保：
       * - Logic 内部可以通过 Tag 访问到对应 Service 或 ModuleRuntime；
       * - 最终 Context 中也能读取到这些 Tag（方便调试与组合）。
       */
      imports?: ReadonlyArray<
        Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>
      >
      /**
       * processes：与该 Module 实现绑定的一组长期流程（含 Link）。
       *
       * - 这些 Effect 会在运行时容器（例如 LogixRuntime.make）中被统一 fork；
       * - 类型上使用宽松的 E/R 以便组合各种跨模块编排逻辑；
       * - 业务代码通常通过 Link.make 构造这些流程。
       */
      processes?: ReadonlyArray<Effect.Effect<void, any, any>>
    }
  ) => ModuleImpl<Id, Sh, R>
}

/**
 * ModuleImpl：Module 的具体实现单元（蓝图 + 初始状态 + 逻辑挂载）。
 *
 * - 它是“配置好的 Module”，可以直接被 React Hook 或 App 装配消费；
 * - 携带了该实现所需的 Env 依赖类型 R。
 */
export interface ModuleImpl<
  Id extends string,
  Sh extends AnyModuleShape,
  REnv = any
> {
  readonly _tag: "ModuleImpl"
  readonly module: ModuleInstance<Id, Sh>
  readonly layer: Layer.Layer<
    ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>,
    never,
    REnv
  >

  /**
   * processes：与该 Module 实现绑定的长期流程（含 Link）。
   *
   * - 由 Module 作者在 Module.make({ processes }) 中声明；
   * - 由运行时容器（例如 LogixRuntime.make）在对应 Runtime Scope 内统一 fork；
   * - withLayer / withLayers 不会改变 processes，仅叠加 Env。
   */
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, any>>

  /**
   * withLayer：在当前 ModuleImpl 的基础上附加一棵额外的 Layer，并返回新的 ModuleImpl。
   *
   * 典型用途：
   * - 在局部范围为某个 ModuleImpl 提供 Service / Env 实现（例如 RegionServiceLive）；
   * - 生成一个“Env 已满足”的 Impl，方便直接交给 React useModule 等上层消费。
   *
   * 说明：
   * - 传入的 Layer 会与当前 ModuleImpl.layer 通过 Layer.mergeAll 合并；
   * - 类型层面暂不精确追踪 Env 的演化，REnv 仅作为“剩余 Env” 的提示。
   */
  readonly withLayer: (
    layer: Layer.Layer<any, never, any>
  ) => ModuleImpl<Id, Sh, REnv>

  /**
   * withLayers：语法糖，依次叠加多棵 Layer。
   *
   * 等价于：`impl.withLayer(Layer.mergeAll(layer1, layer2, ...))`。
   *
   * 使用场景：
   * - 在局部范围一次性为 ModuleImpl 提供多类 Service（例如 RegionService + LoggerService）。
   */
  readonly withLayers: (
    ...layers: ReadonlyArray<Layer.Layer<any, never, any>>
  ) => ModuleImpl<Id, Sh, REnv>
}

/**
 * 辅助类型：将 Action Map 转换为 Union 类型。
 */
export type ActionsFromMap<M extends Record<string, AnySchema>> = {
  [K in keyof M]: {
    readonly _tag: K
    readonly payload: Schema.Schema.Type<M[K]>
  }
}[keyof M]

/**
 * 简化的 Shape 定义助手，专为 Action Map 设计。
 * @example type MyShape = Shape<typeof MyState, typeof MyActionMap>
 */
export type Shape<
  S extends AnySchema,
  M extends Record<string, AnySchema>
> = ModuleShape<S, Schema.Schema<ActionsFromMap<M>>, M>

export function Module<
  Id extends string,
  SSchema extends AnySchema,
  AMap extends Record<string, AnySchema>
>(
  id: Id,
  def: { readonly state: SSchema; readonly actions: AMap }
): ModuleInstance<
  Id,
  ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>
> {
  return ModuleFactory.Module(id, def) as ModuleInstance<
    Id,
    ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>
  >
}
