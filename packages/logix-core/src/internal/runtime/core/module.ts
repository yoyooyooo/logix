import { Context, Effect, Layer, Schema, Stream, SubscriptionRef } from "effect"
import type * as Logic from "./LogicMiddleware.js"
import type { StateTransactionInstrumentation } from "./env.js"

/**
 * 方便约束：任意 Effect Schema。
 * 使用 any 以绕过 Schema 的不变性（Invariance）约束，
 * 确保 ModuleShape<SpecificSchema> 可以 extends AnyModuleShape。
 */
export type AnySchema = any

/**
 * 一类 Module 的「Schema 形状」：只关心 stateSchema / actionSchema，
 * 不关心运行时配置细节（initialState / services / logic 等）。
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

type ActionArgs<P> = [P] extends [void] ? [] | [P] : [P]
type ActionFn<P, Out> = (...args: ActionArgs<P>) => Out

export interface ModuleImplementStateTransactionOptions {
  readonly instrumentation?: StateTransactionInstrumentation
}

/**
 * Module 的运行时接口（类似文档中的「Store as Context」），
 * 对 Logic / Flow 暴露读写、订阅与派发能力。
 */
export interface ModuleRuntime<S, A> {
  readonly id?: string
  /**
   * 关联的 Module 标识：
   * - 由 ModuleRuntime.make 在构造时从 options.moduleId 注入；
   * - 主要用于 Devtools / 调试，将 Runtime 实例与模块维度信息对齐。
   */
  readonly moduleId?: string
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
 * 上层 API 可以接受 ModuleHandle<Sh>，在内部区分 Tag / 实际实例类型。
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
    [K in keyof Sh["actionMap"]]: ActionFn<
      Schema.Schema.Type<Sh["actionMap"][K]>,
      Effect.Effect<void, never, never>
    >
  }
  readonly actions$: Stream.Stream<ActionOf<Sh>, never, never>
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
  E = unknown
> = Logic.Of<Sh, R, unknown, E> | LogicPlan<Sh, R, E>

/**
 * LogicPlan：内部使用的两阶段 Logic 抽象（setup + run）。
 *
 * - setup：在 Module 实例启动阶段运行，用于注册 reducer / lifecycle / Debug 等结构性行为；
 * - run：在 Env 完全就绪后以长期 Fiber 形式运行的主逻辑程序。
 *
 * 说明：
 * - 目前实现阶段，Runtime 仍然将 Logic 视为单阶段程序，等价于 `setup = Effect.void`、`run = Logic`；
 * - 后续在 runtime-logix L4 草案收敛后，会逐步接入真正的两阶段执行模型。
 */
export interface LogicPlan<
  Sh extends AnyModuleShape,
  R = unknown,
  E = unknown
> {
  readonly setup: Logic.Of<Sh, R, void, never>
  readonly run: Logic.Of<Sh, R, unknown, E>
}

/**
 * Bound API：为某一类 Store Shape + Env 创建预绑定的访问器。
 *
 * - 运行时实现由 internal/runtime/BoundApiRuntime 提供；
 * - 顶层 Bound.ts 对外暴露同名类型别名，保持公共 API 一致。
 */
export interface BoundApi<Sh extends AnyModuleShape, R = never> {
  readonly state: {
    readonly read: Logic.Of<Sh, R, StateOf<Sh>, never>
    readonly update: (
      f: (prev: StateOf<Sh>) => StateOf<Sh>
    ) => Logic.Of<Sh, R, void, never>
    readonly mutate: (
      f: (draft: Logic.Draft<StateOf<Sh>>) => void
    ) => Logic.Of<Sh, R, void, never>
    readonly ref: {
      <V = StateOf<Sh>>(
        selector?: (s: StateOf<Sh>) => V
      ): SubscriptionRef.SubscriptionRef<V>
    }
  }
  readonly actions: {
    readonly dispatch: (
      action: ActionOf<Sh>
    ) => Logic.Of<Sh, R, void, never>
    readonly actions$: Stream.Stream<ActionOf<Sh>>
  } & {
    readonly [K in keyof Sh["actionMap"]]: ActionFn<
      Schema.Schema.Type<Sh["actionMap"][K]>,
      Logic.Of<Sh, R, void, never>
    >
  }
  readonly flow: import("./FlowRuntime.js").Api<Sh, R>
  readonly match: <V>(value: V) => Logic.FluentMatch<V>
  readonly matchTag: <V extends { _tag: string }>(
    value: V
  ) => Logic.FluentMatchTag<V>
  readonly lifecycle: {
    readonly onInit: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>
    readonly onDestroy: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>
    readonly onError: (
      handler: (
        cause: import("effect").Cause.Cause<unknown>,
        context: import("./Lifecycle.js").ErrorContext
      ) => Effect.Effect<void, never, R>
    ) => Logic.Of<Sh, R, void, never>
    readonly onSuspend: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>
    readonly onResume: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>
    readonly onReset: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>
  }
  readonly use: {
    <Sh2 extends AnyModuleShape>(
      module: ModuleInstance<string, Sh2>
    ): Logic.Of<Sh, R, ModuleHandle<Sh2>, never>
    <Svc, Id = unknown>(
      tag: Context.Tag<Id, Svc>
    ): Logic.Of<Sh, R, Svc, never>
  }
  readonly onAction: {
    <T extends ActionOf<Sh>>(
      predicate: (a: ActionOf<Sh>) => a is T
    ): Logic.IntentBuilder<T, Sh, R>
    <K extends keyof Sh["actionMap"]>(
      tag: K
    ): Logic.IntentBuilder<
      Extract<ActionOf<Sh>, { _tag: K } | { type: K }>,
      Sh,
      R
    >
  } & {
    [K in keyof Sh["actionMap"]]: Logic.IntentBuilder<
      Extract<ActionOf<Sh>, { _tag: K } | { type: K }>,
      Sh,
      R
    >
  }
  readonly onState: <V>(
    selector: (s: StateOf<Sh>) => V
  ) => Logic.IntentBuilder<V, Sh, R>
  readonly on: <V>(
    source: Stream.Stream<V>
  ) => Logic.IntentBuilder<V, Sh, R>
  /**
   * traits：为 StateTrait 等特性预留的运行时入口。
   *
   * - source.refresh(fieldPath)：触发某个 source 字段的一次显式刷新；
   * - 具体行为由 StateTrait.install 在运行时挂载实现。
   */
  readonly traits: {
    readonly source: {
      readonly refresh: (
        fieldPath: string,
      ) => Logic.Of<Sh, R, void, never>
    }
  }
  /**
   * Primary Reducer 定义入口：
   * - 语义：为某个 Action Tag 注册一条同步、纯状态变换的主 reducer；
   * - 实现：直接落到 Runtime 的 `_tag -> (state, action) => state` 映射，而非 watcher / Flow。
   *
   * 约束：
   * - 每个 Action Tag 最多允许一个 primary reducer；重复注册视为错误；
   * - reducer 必须是纯函数，不依赖 Env，不产生 Effect。
   */
  readonly reducer: <
    K extends keyof Sh["actionMap"],
    A extends Extract<ActionOf<Sh>, { _tag: K } | { type: K }>
  >(
    tag: K,
    reducer: (state: StateOf<Sh>, action: A) => StateOf<Sh>
  ) => Logic.Of<Sh, R, void, never>
}

/**
 * ModuleInstance：领域模块定义对象。
 *
 * - 同时充当 Context.Tag，可作为 `$.use(Module)` 的参数；
 * - 暴露 logic / live 两个工厂，用于挂载 Logic 程序与构造 Live Layer。
 */
export interface ModuleInstance<
  Id extends string,
  Sh extends AnyModuleShape
> extends Context.Tag<any, ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>> {
  readonly _kind: "Module"
  readonly id: Id
  readonly shape: Sh
  readonly stateSchema: Sh["stateSchema"]
  readonly actionSchema: Sh["actionSchema"]

  readonly logic: <R = never, E = unknown>(
    build: (api: BoundApi<Sh, R>) => ModuleLogic<Sh, R, E>
  ) => ModuleLogic<Sh, R, E>

  readonly live: <R = never, E = never>(
    initial: StateOf<Sh>,
    ...logics: Array<ModuleLogic<Sh, R, E>>
  ) => Layer.Layer<ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>, E, R>

  /**
   * implement：基于 Module 定义 + 初始状态 + Logic 集合，生成 ModuleImpl 蓝图。
   *
   * - R 表示 Logic 所需的 Env 类型；
   * - 返回的 ModuleImpl.layer 会携带 R 作为输入环境；
   * - 通过 withLayer/withLayers 可以逐步将 R 收敛为更具体的 Env（甚至 never）。
   */
  readonly implement: <R = never>(config: {
    initial: StateOf<Sh>
    logics?: Array<ModuleLogic<Sh, R, any>>
    imports?: ReadonlyArray<
      Layer.Layer<any, any, any> | ModuleImpl<any, AnyModuleShape, any>
    >
    processes?: ReadonlyArray<Effect.Effect<void, any, any>>
    stateTransaction?: ModuleImplementStateTransactionOptions
  }) => ModuleImpl<Id, Sh, R>
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
  readonly processes?: ReadonlyArray<Effect.Effect<void, any, any>>
  readonly stateTransaction?: ModuleImplementStateTransactionOptions
  readonly withLayer: (
    layer: Layer.Layer<any, never, any>
  ) => ModuleImpl<Id, Sh, REnv>
  readonly withLayers: (
    ...layers: ReadonlyArray<Layer.Layer<any, never, any>>
  ) => ModuleImpl<Id, Sh, REnv>
}

/**
 * 辅助类型：将 Action Map 转换为 Union 类型。
 */
export type ActionsFromMap<M extends Record<string, AnySchema>> = {
  [K in keyof M]: Schema.Schema.Type<M[K]> extends void
    ? {
        readonly _tag: K
        readonly payload?: Schema.Schema.Type<M[K]>
      }
    : {
        readonly _tag: K
        readonly payload: Schema.Schema.Type<M[K]>
      }
}[keyof M]

/**
 * 从 Action Map 推导出按 Tag 分组的 Reducer Map 形态：
 * - 每个 Action Tag 可选地声明一个 `(state, actionOfThisTag) => nextState` 的主 reducer。
 */
export type ReducersFromMap<
  SSchema extends AnySchema,
  AMap extends Record<string, AnySchema>
> = {
  readonly [K in keyof AMap]?: (
    state: Schema.Schema.Type<SSchema>,
    action: Schema.Schema.Type<AMap[K]> extends void
      ? {
          readonly _tag: K
          readonly payload?: Schema.Schema.Type<AMap[K]>
        }
      : {
          readonly _tag: K
          readonly payload: Schema.Schema.Type<AMap[K]>
        }
  ) => Schema.Schema.Type<SSchema>
}

/**
 * 简化的 Shape 定义助手，专为 Action Map 设计。
 * @example type MyShape = Shape<typeof MyState, typeof MyActionMap>
 */
export type Shape<
  S extends AnySchema,
  M extends Record<string, AnySchema>
> = ModuleShape<S, Schema.Schema<ActionsFromMap<M>>, M>
