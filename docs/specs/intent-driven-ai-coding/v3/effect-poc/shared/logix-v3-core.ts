/**
 * v3 Logix 核心类型草案（Store / Logic / Flow）
 *
 * 设计目标：
 * - 以 Effect.Schema 为唯一事实源：State / Action 形状都从 Schema 推导；
 * - Logix.ModuleTagic/Flow 在类型上是一体的：Logic 通过 Schema 派生的 State / Action 约束自身；
 * - 长逻辑推荐封装为普通的 Effect 函数（pattern-style），通过 Ref / Env“借用”状态。
 *
 * 说明：
 * - 本文件以类型为主，函数实现均为占位（例如返回 `null as unknown as T`），用于感受泛型与推导效果；
 * - 真正的运行时代码可以在此基础上单独实现 / 演进。
 */

import { Effect, Stream, SubscriptionRef, Schema, Scope, Context, Layer, ManagedRuntime } from 'effect'

// ---------------------------------------------------------------------------
// Store：以 Schema 为事实源的 State / Action 形状 + 运行时能力
// ---------------------------------------------------------------------------

export namespace Logix {
  /**
   * 方便约束：任意 Effect Schema。
   */
  export type AnySchema = Schema.Schema<any, any, any>

  /**
   * 一类 Module 的「Schema 形状」：只关心 stateSchema / actionSchema，
   * 不关心运行时配置细节（initialState / services / logic 等）。
   *
   * 在业务代码中，通常是：
   *
   *   const stateSchema  = Schema.Struct({ ... })
   *   const actionSchema = Schema.Union(...)
   *
   *   type CounterShape = Logix.ModuleShape<typeof stateSchema, typeof actionSchema>
   */
  export interface ModuleShape<
    SSchema extends AnySchema,
    ASchema extends AnySchema,
    AMap extends Record<string, AnySchema> = Record<string, never>,
  > {
    readonly stateSchema: SSchema
    readonly actionSchema: ASchema
    readonly actionMap: AMap
  }

  /**
   * 方便约束：任意 ModuleShape。
   */
  export type AnyModuleShape = ModuleShape<any, any, any>

  export type StateOf<Sh extends AnyModuleShape> = Schema.Schema.Type<Sh['stateSchema']>

  export type ActionOf<Sh extends AnyModuleShape> = Schema.Schema.Type<Sh['actionSchema']>

  /**
   * v3：强类型 Module Tag，用于在 Logic.forShape / 协作逻辑中进行类型安全约束。
   *
   * 说明：
   * - Id 类型对本 PoC 不重要，因此统一使用 `any`；
   * - Service 类型固定为当前 Shape 对应的 Runtime。
   */
  export type ModuleTag<Sh extends AnyModuleShape> = Context.Tag<any, ModuleRuntime<StateOf<Sh>, ActionOf<Sh>>>

  /**
   * Module 句柄（ModulLogix.ModuleHandle）：
   * - 在 React Adapter / 上层集成中，用于统一接收「Tag 或运行时实例」两种形态；
   * - 作为 Env/DI：通常使用 Logix.ModuleTag<Sh> 放入 Layer / Runtime 环境；
   * - 作为局部持有：通常使用运行时实例直接在组件或逻辑中传递。
   *
   * 上层 API 可以接受 Logix.ModuleHandle<Sh>，在内部区分 Tag / 实例实际类型。
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
      selector: (s: StateOf<Sh>) => V,
    ) => Effect.Effect<V, never, ModuleTag<Sh>>
    readonly changes: <V>(selector: (s: StateOf<Sh>) => V) => Stream.Stream<V, never, ModuleTag<Sh>>
    readonly dispatch: (action: ActionOf<Sh>) => Effect.Effect<void, never, ModuleTag<Sh>>
    readonly actions: {
      [K in keyof Sh['actionMap']]: (
        payload: Schema.Schema.Type<Sh['actionMap'][K]>
      ) => Effect.Effect<void, never, ModuleTag<Sh>>
    }
  }

  /**
   * Module 的运行时接口（类似文档中的「Store as Context」），
   * 对 Logic / Flow 暴露读写、订阅与派发能力。
   */
  export interface ModuleRuntime<S, A> {
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
     * 提供一个 SubscriptionRef，用于长逻辑 / 细粒度逻辑直接借用局部状态。
     */
    readonly ref: {
      /**
       * 不传 selector 时，借用整棵 State 的 Ref。
       */
      (): SubscriptionRef.SubscriptionRef<S>
      /**
       * 传入 selector 时，借用局部视图的 Ref。
       */
      <V>(selector: (s: S) => V): SubscriptionRef.SubscriptionRef<V>
    }
  }

  // ----- 与 docs/specs/runtime-logix/core/02-module-and-logic-api.md 对齐的 API 形状 -----
  // 这里用类型占位的“Layer 形状”来模拟 State / Action 的 Layer，
  // 同时展示它们如何与一组 Logic 程序一起被 ModuleRuntime.make 组合。

  export namespace State {
    export type Layer<S> = Layer.Layer<never, never, State.Tag<S>>
    export type Tag<S> = Context.Tag<any, S>
  }

  export namespace Actions {
    export type Layer<A> = Layer.Layer<never, never, Actions.Tag<A>>
    export type Tag<A> = Context.Tag<any, { dispatch: (a: A) => Effect.Effect<void>; actions$: Stream.Stream<A> }>
  }

}
export namespace ModuleRuntime {
  export function make<Sh extends Logix.AnyModuleShape>(
    stateLayer: Logix.State.Layer<Logix.StateOf<Sh>>,
    actionLayer: Logix.Actions.Layer<Logix.ActionOf<Sh>>,
    ...logicLayers: Array<Logic.Of<Sh, any, any, any>>
  ): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>> {
    return null as unknown as Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
  }
}

// ---------------------------------------------------------------------------
// Logic：在某一类 Store / Module 上长期运行的一段 Effect 程序
// ---------------------------------------------------------------------------

export namespace Logic {
  /**
   * v3：Logic 作用域内用于获取当前 Logix.ModuleRuntime 的核心 Tag。
   *
   * - 在运行时代码中，Module.live 会在对应 Scope 内 provide 该 Tag；
   * - 在 Pattern / Namespace 内部，可以通过 `yield* Logic.RuntimeTag` 借用当前 Store 能力。
   *
   * 这里的 Id / Service 类型均为 Runtime<any, any> 的宽类型，具体 Shape 由 Logic.Of<Sh,R> 约束。
   */
  export const RuntimeTag: Context.Tag<any, Logix.ModuleRuntime<any, any>> = Context.GenericTag<any, Logix.ModuleRuntime<any, any>>(
    '@logix/Runtime',
  )

  /**
   * 平台能力接口：定义了 Logix 引擎与宿主环境（React/Node/Native）的交互契约。
   *
   * - 核心思想：Logix Core 不依赖具体平台，而是通过 DI 注入 Platform 实现。
   * - 默认实现：Node 环境下为空操作，React 环境下对接 DOM 事件。
   */
  export interface Platform {
    readonly lifecycle: {
      /**
       * 挂起钩子：当宿主环境进入“后台/不可见”状态时触发。
       * 典型场景：Tab 切换、App 切后台、组件 KeepAlive 隐藏。
       */
      readonly onSuspend: (eff: Effect.Effect<void>) => Effect.Effect<void>
      /**
       * 恢复钩子：当宿主环境从“后台”恢复为“前台/可见”状态时触发。
       */
      readonly onResume: (eff: Effect.Effect<void>) => Effect.Effect<void>
    }
  }

  export const Platform = Context.GenericTag<Platform>('@logix/Platform')

  /**
   * Logic 能看到的环境：
   * - 当前 Shape 对应的 Store Runtime Tag（通常是 Logix.ModuleTag<Sh> 或 ModuleInstance<…, Sh>）；
   * - 叠加额外注入的服务环境 R。
   * - 默认包含 Platform 能力。
   */
  export type Env<Sh extends Logix.AnyModuleShape, R> =
    | Logix.ModuleTag<Sh>
    | Platform
    | R

  /**
   * 严格 Logic Effect 别名：约定 Env 为 Logic.Env<Sh, R>。
   * 用于需要精确约束 A / E / R 的场景。
   */
  export type Of<Sh extends Logix.AnyModuleShape, R = never, A = void, E = never> = Effect.Effect<A, E, Env<Sh, R>>

  /**
   * Logic.of：将一段已经在 Logic.Env<Sh,R> 上运行的 Effect 显式标记为 Logic.Of。
   *
   * 说明：
   * - 运行时只是值的透传，不引入额外语义；
   * - 主要用于 Pattern / 库作者在封装 `(input) => Effect` 时，显式标注返回值为 Logic.Of；
   * - 业务代码通常通过 Module.logic(($)=>Effect.gen(...)) 即可，无需直接调用本函数。
   */
  export function of<Sh extends Logix.AnyModuleShape, R = never, A = void, E = never>(
    eff: Effect.Effect<A, E, Env<Sh, R>>,
  ): Of<Sh, R, A, E> {
    return eff as Of<Sh, R, A, E>
  }

  /**
   * L2: Fluent Intent Builder (Isomorphic to Flow.Api)
   * 本质是 Flow.Api 的 Fluent 代理。
   * 它持有内部 Stream，并提供与 Flow.Api 同名的方法来转换或执行它。
   */
  export interface IntentBuilder<Payload, Sh extends Logix.AnyModuleShape, R = never> {
    // --- Transformations (Proxies to Flow.*) ---

    /** Proxy for `stream.pipe(Flow.debounce(ms))` */
    readonly debounce: (ms: number) => IntentBuilder<Payload, Sh, R>

    /** Proxy for `stream.pipe(Flow.throttle(ms))` */
    readonly throttle: (ms: number) => IntentBuilder<Payload, Sh, R>

    /** Proxy for `stream.pipe(Flow.filter(fn))` */
    readonly filter: (predicate: (value: Payload) => boolean) => IntentBuilder<Payload, Sh, R>

    /** Proxy for `stream.pipe(Flow.map(fn))` */
    readonly map: <U>(f: (value: Payload) => U) => IntentBuilder<U, Sh, R>

    // --- Terminators (Proxies to Flow.run*) ---

    /**
     * 并行运行 (Parallel)
     * Proxy for `stream.pipe(Flow.run(effect))`
     */
    readonly run: <A = void, E = never, R2 = unknown>(
      effect: Effect.Effect<A, E, R2> | ((p: Payload) => Effect.Effect<A, E, R2>)
    ) => Of<Sh, R & R2, void, E>

    /**
     * 最新优先 (Switch / Cancel Previous)
     * Proxy for `stream.pipe(Flow.runLatest(effect))`
     */
    readonly runLatest: <A = void, E = never, R2 = unknown>(
      effect: Effect.Effect<A, E, R2> | ((p: Payload) => Effect.Effect<A, E, R2>)
    ) => Of<Sh, R & R2, void, E>

    /**
     * 阻塞防重 (Exhaust / Ignore New)
     * Proxy for `stream.pipe(Flow.runExhaust(effect))`
     */
    readonly runExhaust: <A = void, E = never, R2 = unknown>(
      effect: Effect.Effect<A, E, R2> | ((p: Payload) => Effect.Effect<A, E, R2>)
    ) => Of<Sh, R & R2, void, E>

    /**
     * 串行排队 (Sequence / Queue)
     * Proxy for `stream.pipe(Flow.runSequence(effect))`
     */
    readonly runSequence: <A = void, E = never, R2 = unknown>(
      effect: Effect.Effect<A, E, R2> | ((p: Payload) => Effect.Effect<A, E, R2>)
    ) => Of<Sh, R & R2, void, E>

    // --- Escape Hatch ---
    readonly toStream: () => Stream.Stream<Payload>
  }

  /**
   * Fluent Match Builder：包一层 Effect.Match 风格的分支 DSL，方便平台识别结构化分支。
   *
   * 说明：
   * - 这里的实现仅用于类型占位，Env / E / A 均使用宽类型 any；
   * - 未来在 runtime-logix 主线稳定后，可与那边的 FluentMatch 类型对齐。
   */
  export interface FluentMatch<V> {
    readonly when: (
      valueOrPredicate: V | ((value: V) => boolean),
      handler: (value: V) => Effect.Effect<any, any, any>,
    ) => FluentMatch<V>
    readonly otherwise: (
      handler: (value: V) => Effect.Effect<any, any, any>,
    ) => Effect.Effect<any, any, any>
    readonly exhaustive: () => Effect.Effect<any, any, any>
  }

  /**
   * Fluent Match Builder（按 _tag 分支）。
   */
  export interface FluentMatchTag<V extends { _tag: string }> {
    readonly tag: <K extends V['_tag']>(
      tag: K,
      handler: (value: Extract<V, { _tag: K }>) => Effect.Effect<any, any, any>,
    ) => FluentMatchTag<V>
    readonly exhaustive: () => Effect.Effect<any, any, any>
  }

  export interface Api<Sh extends Logix.AnyModuleShape, R = never> {
    /**
     * State 子域：整棵状态的读 / 写 / Ref 借用。
     *
     * 约束点：
     * - update 语义与 React.setState(fn) 类似：接收「prev -> next」的纯函数；
     * - 如需 mutative 风格更新，使用 mutate(draft => { ... })，由运行时基于 mutative 等库实现；
     * - 细粒度更新可以通过 ref(selector) + SubscriptionRef.update 或外层封装的 helper 完成。
     */
    readonly state: {
      readonly read: Effect.Effect<Logix.StateOf<Sh>, never, Env<Sh, R>>
      readonly update: (
        f: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>,
      ) => Effect.Effect<void, never, Env<Sh, R>>
      /**
       * 使用 mutative 风格更新：接收一个可以“就地修改 draft” 的函数。
       *
       * 运行时实现可以固定选用 mutative，将 draft 修改映射为不可变更新。
       * 调用方推荐写法：
       *
       *   state.mutate(draft => { draft.count += 1 })
       */
      readonly mutate: (f: (draft: Logix.StateOf<Sh>) => void) => Effect.Effect<void, never, Env<Sh, R>>
      readonly ref: {
        (): SubscriptionRef.SubscriptionRef<Logix.StateOf<Sh>>
        <V>(selector: (s: Logix.StateOf<Sh>) => V): SubscriptionRef.SubscriptionRef<V>
      }
    }

    /**
     * Actions 子域：派发与原始 Action 流。
     */
    readonly actions: {
      readonly dispatch: (action: Logix.ActionOf<Sh>) => Effect.Effect<void, never, Env<Sh, R>>
      readonly actions$: Stream.Stream<Logix.ActionOf<Sh>>
    }

    /**
     * Flow 子域：基于 Runtime 源构造业务流的工具集合。
     * 只负责从 actions / changes 构造 Stream，并把 Effect 跑起来。
     */
    readonly flow: Flow.Api<Sh, R>
    /**
     * Fluent Match：围绕 Effect.Match 的结构化分支工具集合。
     */
    readonly match: <V>(value: V) => FluentMatch<V>
    readonly matchTag: <V extends { _tag: string }>(value: V) => FluentMatchTag<V>
  }

  /**
   * Action API：固定方法 + 动态 Action Dispatcher。
   */
  export type ActionsApi<Sh extends Logix.AnyModuleShape, R> = {
    readonly dispatch: (action: Logix.ActionOf<Sh>) => Of<Sh, R, void, never>
    readonly actions$: Stream.Stream<Logix.ActionOf<Sh>>
  } & {
    readonly [K in keyof Sh['actionMap']]: (
      payload: Schema.Schema.Type<Sh['actionMap'][K]>,
    ) => Of<Sh, R, void, never>
  }

  /**
   * Bound API 工厂：为某一类 Store Shape + Env 创建预绑定的访问器。
   *
   * - 默认基于 Logic.RuntimeTag 获取当前 Logix.ModuleRuntime；
   * - 可选传入 Logix.ModuleTag<Sh> 以显式指定 Runtime 来源（例如跨 Store 协作场景）。
   *
   * 说明：本函数仅提供类型签名，具体实现由运行时代码注入，本 PoC 中返回值为占位。
   */
  export interface BoundApi<Sh extends Logix.AnyModuleShape, R = never> {
    readonly state: {
      readonly read: Of<Sh, R, Logix.StateOf<Sh>, never>
      readonly update: (f: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>) => Of<Sh, R, void, never>
      readonly mutate: (f: (draft: Logix.StateOf<Sh>) => void) => Of<Sh, R, void, never>
      readonly ref: {
        (): SubscriptionRef.SubscriptionRef<Logix.StateOf<Sh>>
        <V>(selector: (s: Logix.StateOf<Sh>) => V): SubscriptionRef.SubscriptionRef<V>
      }
    }
    readonly actions: ActionsApi<Sh, R>
    readonly flow: Flow.Api<Sh, R>
    readonly match: <V>(value: V) => FluentMatch<V>
    readonly matchTag: <V extends { _tag: string }>(value: V) => FluentMatchTag<V>
    /**
     * 生命周期钩子：替代 StoreConfig.lifecycle，在 Logic 中定义初始化与销毁逻辑。
     * 约束：必须处理所有错误 (E=never)。
     */
    readonly lifecycle: {
      readonly onInit: (eff: Of<Sh, R, void, never>) => Of<Sh, R, void, never>
      readonly onDestroy: (eff: Of<Sh, R, void, never>) => Of<Sh, R, void, never>
      /**
       * 错误上报钩子：当 Logic Fiber 发生未捕获 Defect 时触发。
       * 仅用于上报，无法阻止 Scope 关闭。
       */
      readonly onError: (handler: (cause: import('effect').Cause.Cause<never>) => Effect.Effect<void, never, R>) => Of<Sh, R, void, never>

      // --- Platform Hooks (Proxied to Platform Service) ---

      /**
       * 挂起：当 App/组件 进入后台或不可见时触发。
       * (Requires Platform Layer)
       */
      readonly onSuspend: (eff: Of<Sh, R, void, never>) => Of<Sh, R, void, never>

      /**
       * 恢复：当 App/组件 恢复前台或可见时触发。
       * (Requires Platform Layer)
       */
      readonly onResume: (eff: Of<Sh, R, void, never>) => Of<Sh, R, void, never>

      /**
       * 业务重置：标准化“软重置”信号（如 Logout / Clear Form）。
       * (Requires Platform Layer or Runtime Support)
       */
      readonly onReset: (eff: Of<Sh, R, void, never>) => Of<Sh, R, void, never>
    }
    /**
     * 统一依赖注入入口：
     * - 传入 Module 定义：返回跨 Module 访问用的 Logix.ReadonlyModuleHandle；
     * - 传入普通 Service Tag 时：返回 Service 实例。
     *
     * 说明：正式实现中推荐优先接收 Module 定义，其余 Tag 视为 Service。
     * 本 PoC 在类型上仍使用 Tag/Module 占位，但调用侧推荐传入 Module。
     */
    readonly use: {
      <Sh2 extends Logix.AnyModuleShape>(
        module: import('./logix-v3-core').Logix.ModuleInstance<string, Sh2>,
      ): Of<Sh, R, Logix.ModuleHandle<Sh2>, never>
      <Svc, Id = any>(tag: Context.Tag<Id, Svc>): Of<Sh, R, Svc, never>
    }
    /**
     * 保留底层 services 入口，供 Pattern / 内核使用；业务代码推荐统一使用 $.use。
     */
    readonly services: <Svc, Id = any>(tag: Context.Tag<Id, Svc>) => Effect.Effect<Svc, never, R>

    /**
     * Action 监听入口：支持谓词、_tag / type 字面量、值对象或 Schema 作为「值选择器」进行变体缩小。
     *
     * 示例：
     *   $.onAction('inc')
     *   $.onAction(Actions.inc)
     *   $.onAction(CounterAction.IncSchema)
     */
    readonly onAction: {
      // 1. 兼容原有形式：类型守卫谓词
      <T extends Logix.ActionOf<Sh>>(
        predicate: (a: Logix.ActionOf<Sh>) => a is T,
      ): IntentBuilder<T, Sh, R>

      // 2. 通过 _tag / type 字面量匹配某一变体
      <K extends (Logix.ActionOf<Sh> extends { _tag: string } ? Logix.ActionOf<Sh>['_tag'] : never)>(
        tag: K,
      ): IntentBuilder<
        Extract<
          Logix.ActionOf<Sh>,
          { _tag: K } | { type: K }
        >,
        Sh,
        R
      >

      // 3. 通过具体 Action 值（例如 Actions.inc）进行缩小
      <A extends Logix.ActionOf<Sh> & ({ _tag: string } | { type: string })>(
        value: A,
      ): IntentBuilder<A, Sh, R>

      // 4. 通过 Schema（单一变体 Schema）进行缩小
      <Sc extends Logix.AnySchema>(
        schema: Sc,
      ): IntentBuilder<
        Extract<Logix.ActionOf<Sh>, Schema.Schema.Type<Sc>>,
        Sh,
        R
      >
    }

    readonly onState: <V>(selector: (s: Logix.StateOf<Sh>) => V) => IntentBuilder<V, Sh, R>

    readonly on: <V, E = never, R2 = never>(source: Stream.Stream<V, E, R2>) => IntentBuilder<V, Sh, R | R2>
  }

  export function forShape<Sh extends Logix.AnyModuleShape, R = never>(_tag?: Logix.ModuleTag<Sh>): BoundApi<Sh, R> {
    // 占位实现：仅用于类型推导，运行时代码会提供真实实现。
    return null as unknown as BoundApi<Sh, R>
  }

}

// ---------------------------------------------------------------------------
// Logix：面向业务与平台的 Module / Logic / Live 三元组（类型草案）
// ---------------------------------------------------------------------------

export namespace Logix {
  // export type AnySchema = Logix.AnySchema // Removed duplicate

  /**
   * ModuleLogic：在某一类 Module 上运行的一段逻辑程序。
   *
   * - 约定 Env 为 Logic.Env<Sh,R>；
   * - 返回值统一视为 void，错误与依赖通过 E/R 表达。
   */
  export type ModuleLogic<Sh extends Logix.AnyModuleShape, R = unknown, E = never> =
    Logic.Of<Sh, R, unknown, E>

  /**
   * ModuleInstance：领域模块定义对象。
   *
   * - 同时充当 Context.Tag，可作为 `$.use(Module)` 的参数；
   * - 暴露 logic / live 两个工厂，用于挂载 Logic 程序与构造 Live Layer。
   */
  export interface ModuleInstance<Id extends string, Sh extends Logix.AnyModuleShape>
    extends Context.Tag<any, Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>> {
    readonly _kind: 'Module'
    readonly id: Id
    readonly shape: Sh
    readonly stateSchema: Sh['stateSchema']
    readonly actionSchema: Sh['actionSchema']

    readonly logic: <
      R = unknown,
      FX extends Effect.Effect<any, any, any> = Effect.Effect<any, any, any>,
    >(
      build: (api: import('./logix-v3-core').Logic.BoundApi<Sh, R>) => FX,
    ) => FX

    readonly live: <
      R = never,
      E = never,
    >(
      initial: Logix.StateOf<Sh>,
      ...logics: Array<ModuleLogic<Sh, R, E>>
    ) => Layer.Layer<R, E, Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>>
  }

  /**
   * 辅助类型：将 Action Map 转换为 Union 类型。
   */
  export type ActionsFromMap<M extends Record<string, AnySchema>> = {
    [K in keyof M]: { readonly _tag: K; readonly payload: Schema.Schema.Type<M[K]> }
  }[keyof M]

  /**
   * 简化的 Shape 定义助手，专为 Action Map 设计。
   * @example type MyShape = Logix.Shape<typeof MyState, typeof MyActionMap>
   */
  export type Shape<
    S extends AnySchema,
    M extends Record<string, AnySchema>,
  > = ModuleShape<S, Schema.Schema<ActionsFromMap<M>>, M>

  /**
   * v3: Link (原 Orchestrator)
   * 用于跨模块协作的胶水层。
   *
   * 特点：
   * - 不持有自己的 State；
   * - 可以访问多个 Module 的 ReadonlyHandle；
   * - 只能定义 Logic，不能定义 State/Action。
   */
  export function Link<
    Modules extends Record<string, ModuleInstance<any, any>>,
    E = never,
    R = never
  >(
    modules: Modules,
    logic: (
      $: { [K in keyof Modules]: ModuleHandle<Modules[K]['shape']> }
    ) => Effect.Effect<void, E, R>
  ): Effect.Effect<void, E, R> {
    return null as unknown as Effect.Effect<void, E, R>
  }

  export function Module<
    Id extends string,
    SSchema extends AnySchema,
    AMap extends Record<string, AnySchema>,
  >(
    id: Id,
    def: { readonly state: SSchema; readonly actions: AMap },
  ): ModuleInstance<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>> {
    return null as unknown as ModuleInstance<Id, ModuleShape<SSchema, Schema.Schema<ActionsFromMap<AMap>>, AMap>>
  }

  // -------------------------------------------------------------------------
  // App Runtime Definition
  // -------------------------------------------------------------------------

  export interface LogixAppConfig<R> {
    readonly layer: Layer.Layer<never, never, R> // R is provided by this layer
    readonly modules: ReadonlyArray<{
      readonly tag: Context.Tag<any, any>
      readonly runtime: any
    }>
    readonly processes: ReadonlyArray<Effect.Effect<void, any, R>>
    readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void>
  }

  export interface AppDefinition<R> {
    readonly definition: LogixAppConfig<R>
    readonly layer: Layer.Layer<never, never, R> // Simplified for PoC
    readonly makeRuntime: () => ManagedRuntime.ManagedRuntime<R, never>
  }

  export function app<R>(config: LogixAppConfig<R>): AppDefinition<R> {
    // Safety Net: Check for duplicate Tags/IDs in modules
    const seenIds = new Set<string>()
    for (const m of config.modules) {
      // 1. Try to get semantic ID (if it's a ModuleInstance)
      // 2. Fallback to Tag's string representation (Context.Tag)
      const id = 'id' in m.tag ? String((m.tag as any).id) : m.tag.toString()

      if (seenIds.has(id)) {
        throw new Error(`[Logix] Duplicate Module ID/Tag detected: "${id}". \nEnsure all modules in Logix.app have unique IDs.`)
      }
      seenIds.add(id)
    }

    return null as unknown as AppDefinition<R>
  }

  /**
   * 语法糖：将 Tag 与 Runtime 实例配对，用于 Logix.app 的 modules 配置。
   */
  export function provide<Tag extends Context.Tag<any, any>, Runtime>(
    tag: Tag,
    runtime: Runtime
  ): { readonly tag: Tag; readonly runtime: Runtime } {
    return { tag, runtime }
  }
}


// ---------------------------------------------------------------------------
// Flow：围绕 Store Runtime 源构造业务流的工具集合
// ---------------------------------------------------------------------------

export namespace Flow {
  /**
   * Flow 相关 Effect 默认运行在 Logic.Env 上：
   * - 包含当前 Shape 对应的 Logix.ModuleRuntime；
   * - 叠加额外服务环境 R。
   *
   * 方便在命名空间级 DSL 中直接使用 Effect 的 DI 能力。
   */
  export type Env<Sh extends Logix.AnyModuleShape, R = unknown> = Logic.Env<Sh, R>

  /**
   * 「监听变化然后更新 State」的强语义语法糖签名（L3 库级 Helper）。
   *
   * 约定：
   * - selector 从整棵 State 中抽取被监听的视图；
   * - reducer 可以是纯函数，也可以返回 Effect：
   *   - 纯函数：直接基于 prev 与当前变化值计算 next；
   *   - Effect：适用于需要先调用 Service 再决定 next 的场景。
   *
   * 所有实现都运行在 Logic.Env 上，内部会使用 Logix.ModuleRuntime 的 changes$ / setState。
   */
  export interface AndUpdateOnChanges<Sh extends Logix.AnyModuleShape, R = never> {
    <V>(
      selector: (s: Logix.StateOf<Sh>) => V,
      reducer: (value: V, prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>,
    ): Logic.Of<Sh, R, void, never>
    <V, E, R2>(
      selector: (s: Logix.StateOf<Sh>) => V,
      reducer: (value: V, prev: Logix.StateOf<Sh>) => Effect.Effect<Logix.StateOf<Sh>, E, R2>,
    ): Logic.Of<Sh, R & R2, void, E>
  }

  /**
   * 「监听某一类 Action 然后更新 State」的强语义语法糖签名（L3 库级 Helper）。
   *
   * 约定：
   * - predicate 通常为类型守卫，用于筛选某一变体 Action；
   * - reducer 接收当前 Action 与 prev State，返回 next State 或 Effect；
   * - 与 fromAction + run 的组合相比，显式表达了「事件 → 状态更新」意图。
   */
  export interface AndUpdateOnAction<Sh extends Logix.AnyModuleShape, R = never> {
    <T extends Logix.ActionOf<Sh>>(
      predicate: (a: Logix.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>,
    ): Logic.Of<Sh, R, void, never>
    <T extends Logix.ActionOf<Sh>, E, R2>(
      predicate: (a: Logix.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Logix.StateOf<Sh>) => Effect.Effect<Logix.StateOf<Sh>, E, R2>,
    ): Logic.Of<Sh, R & R2, void, E>
  }

  export interface Api<Sh extends Logix.ModuleShape<any, any>, R = never> {
    /**
     * 从 Action 流中筛选某一类 Action。
     * 通常使用类型守卫缩小为具体变体。
     */
    readonly fromAction: <T extends Logix.ActionOf<Sh>>(
      predicate: (a: Logix.ActionOf<Sh>) => a is T,
    ) => Stream.Stream<T>

    /**
     * 从 State 的某个 selector 构造变化流。
     */
    readonly fromChanges: <V>(selector: (s: Logix.StateOf<Sh>) => V) => Stream.Stream<V>

    /**
     * 常见算子：防抖/节流等。
     * 实现上只是对 Stream 的二次封装。
     */
    readonly debounce: <V>(ms: number) => (stream: Stream.Stream<V>) => Stream.Stream<V>

    /**
     * 节流：限制事件触发频率。
     */
    readonly throttle: <V>(ms: number) => (stream: Stream.Stream<V>) => Stream.Stream<V>

    /**
     * 路由 / 筛选：只放过满足条件的事件。
     */
    readonly filter: <V>(predicate: (value: V) => boolean) => (stream: Stream.Stream<V>) => Stream.Stream<V>

    /**
     * 将一个 Effect「挂在」某个源流上执行。
     * 典型用法：source.pipe(flow.run(effect))
     * 并发语义：默认允许所有触发并行执行。
     */
    readonly run: <A = any, E = any, R2 = any>(
      eff: Effect.Effect<A, E, R2>,
    ) => (stream: Stream.Stream<any>) => Effect.Effect<void, E, R2>

    /**
     * 并发语义变体：只保留最新触发（类似 switchLatest）。
     */
    readonly runLatest: <A = any, E = any, R2 = any>(
      eff: Effect.Effect<A, E, R2>,
    ) => (stream: Stream.Stream<any>) => Effect.Effect<void, E, R2>

    /**
     * 并发语义变体：首个执行完成前忽略后续触发（防重复提交）。
     */
    readonly runExhaust: <A = any, E = any, R2 = any>(
      eff: Effect.Effect<A, E, R2>,
    ) => (stream: Stream.Stream<any>) => Effect.Effect<void, E, R2>

    /**
     * 串行语义变体：将触发的 Effect 排队依次执行。
     * 适用于消息队列消费等场景。
     */
    readonly runSequence: <A = any, E = any, R2 = any>(
      eff: Effect.Effect<A, E, R2>,
    ) => (stream: Stream.Stream<any>) => Effect.Effect<void, E, R2>

    /**
     * L3 Helper：监听 State 某个 selector 的变化，并在每次变化时更新 State。
     *
     * 适用场景：
     * - derived state / UI 衍生标记；
     * - 简单的「根据某个字段变化自动重置/联动另一个字段」。
     *
     * 注意：跨 Store 协调（A 变化驱动 B）推荐使用单独的 Coordinator helper。
     */
    readonly andUpdateOnChanges: AndUpdateOnChanges<Sh, R>

    /**
     * L3 Helper：监听某一类 Action，并在每次触发时更新 State。
     *
     * 适用场景：
     * - 表单提交 / 重置等「事件驱动状态重排」；
     * - Tab / 路由切换等「离散事件触发 UI 状态更新」。
     */
    readonly andUpdateOnAction: AndUpdateOnAction<Sh, R>
  }

  /**
   * 命名空间级 DSL：与 Api.andUpdateOnChanges 语义一致，用于在 **L3 库 / Pattern 内部** 封装可复用逻辑。
   *
   * 约定：
   * - 业务 Logic 推荐优先使用 `$.onState(...).then(...)` 表达「State → State」联动；
   * - `Flow.andUpdateOnChanges` 仅作为库作者在底层封装时使用，不再作为业务代码主路径示例。
   */
  export const andUpdateOnChanges: {
    <Sh extends Logix.ModuleShape<any, any>, R = never, V = any>(
      selector: (s: Logix.StateOf<Sh>) => V,
      reducer: (value: V, prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>,
    ): Logic.Of<Sh, R, void, never>
    <Sh extends Logix.ModuleShape<any, any>, R = never, V = any, E = never, R2 = never>(
      selector: (s: Logix.StateOf<Sh>) => V,
      reducer: (value: V, prev: Logix.StateOf<Sh>) => Effect.Effect<Logix.StateOf<Sh>, E, R2>,
    ): Logic.Of<Sh, R & R2, void, E>
  } = null as unknown as {
    <Sh extends Logix.ModuleShape<any, any>, R = never, V = any>(
      selector: (s: Logix.StateOf<Sh>) => V,
      reducer: (value: V, prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>,
    ): Logic.Of<Sh, R, void, never>
    <Sh extends Logix.ModuleShape<any, any>, R = never, V = any, E = never, R2 = never>(
      selector: (s: Logix.StateOf<Sh>) => V,
      reducer: (value: V, prev: Logix.StateOf<Sh>) => Effect.Effect<Logix.StateOf<Sh>, E, R2>,
    ): Logic.Of<Sh, R & R2, void, E>
  }

  /**
   * 命名空间级 DSL：与 Api.andUpdateOnAction 语义一致，用于在 **L3 库 / Pattern 内部** 封装可复用逻辑。
   *
   * 约定：
   * - 业务 Logic 推荐优先使用 `$.onAction(...).then(...)` 表达「Action → State」联动；
   * - `Flow.andUpdateOnAction` 仅作为库作者在底层封装时使用，不再作为业务代码主路径示例。
   */
  export const andUpdateOnAction: {
    <Sh extends Logix.ModuleShape<any, any>, R = never, T extends Logix.ActionOf<Sh> = Logix.ActionOf<Sh>>(
      predicate: (a: Logix.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>,
    ): Logic.Of<Sh, R, void, never>
    <
      Sh extends Logix.ModuleShape<any, any>,
      R = never,
      T extends Logix.ActionOf<Sh> = Logix.ActionOf<Sh>,
      E = never,
      R2 = never,
    >(
      predicate: (a: Logix.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Logix.StateOf<Sh>) => Effect.Effect<Logix.StateOf<Sh>, E, R2>,
    ): Logic.Of<Sh, R & R2, void, E>
  } = null as unknown as {
    <Sh extends Logix.ModuleShape<any, any>, R = never, T extends Logix.ActionOf<Sh> = Logix.ActionOf<Sh>>(
      predicate: (a: Logix.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>,
    ): Logic.Of<Sh, R, void, never>
    <
      Sh extends Logix.ModuleShape<any, any>,
      R = never,
      T extends Logix.ActionOf<Sh> = Logix.ActionOf<Sh>,
      E = never,
      R2 = never,
    >(
      predicate: (a: Logix.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Logix.StateOf<Sh>) => Effect.Effect<Logix.StateOf<Sh>, E, R2>,
    ): Logic.Of<Sh, R & R2, void, E>
  }
}

// ---------------------------------------------------------------------------
// Coordinator：跨 Store 协调的 Intent 原语（类型草案）
// ---------------------------------------------------------------------------

export namespace Coordinator {
  /**
   * Coordinator 运行环境：
   * - 至少包含 Source / Target 两棵 Store 的 Runtime；
   * - 可叠加额外服务环境 R。
   */
  export type Env<
    ShSource extends Logix.ModuleShape<any, any>,
    ShTarget extends Logix.ModuleShape<any, any>,
    R = unknown,
  > = Logix.ModuleRuntime<Logix.StateOf<ShSource>, Logix.ActionOf<ShSource>> &
    Logix.ModuleRuntime<Logix.StateOf<ShTarget>, Logix.ActionOf<ShTarget>> &
    R

  /**
   * Intent 原语：监听 Source Store 某个 State 视图的变化，并向 Target Store 派发 Action。
   *
   * 典型场景：
   * - SearchStore.results 改变时自动向 DetailStore 派发初始化 Action；
   * - FilterStore 条件变化时通知 ListStore 重新加载。
   */
  export interface OnChangesDispatch<
    ShSource extends Logix.ModuleShape<any, any>,
    ShTarget extends Logix.ModuleShape<any, any>,
    R = unknown,
  > {
    <V>(
      selector: (s: Logix.StateOf<ShSource>) => V,
      map: (value: V) => Logix.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <V>(
      selector: (s: Logix.StateOf<ShSource>) => V,
      map: (value: V) => ReadonlyArray<Logix.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  }

  /**
   * Intent 原语：监听 Source Store 某一类 Action，并向 Target Store 派发 Action。
   *
   * 典型场景：
   * - GlobalLayoutStore 中的 "logout" Action 驱动多个业务 Store 的 reset；
   * - WizardStore 中的 "step/complete" Action 驱动 SummaryStore 重新聚合数据。
   */
  export interface OnActionDispatch<
    ShSource extends Logix.ModuleShape<any, any>,
    ShTarget extends Logix.ModuleShape<any, any>,
    R = unknown,
  > {
    <TSource extends Logix.ActionOf<ShSource>>(
      predicate: (a: Logix.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => Logix.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <TSource extends Logix.ActionOf<ShSource>>(
      predicate: (a: Logix.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => ReadonlyArray<Logix.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  }

  /**
   * 命名空间级协同 DSL：OnChangesDispatch / OnActionDispatch 的占位实现。
   *
   * 运行时代码可以基于 Logix.ModuleRuntime.changes$ / actions$ + dispatch 来实现。
   */
  export const onChangesDispatch: {
    <
      ShSource extends Logix.ModuleShape<any, any>,
      ShTarget extends Logix.ModuleShape<any, any>,
      R = unknown,
      V = any,
    >(
      selector: (s: Logix.StateOf<ShSource>) => V,
      map: (value: V) => Logix.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <
      ShSource extends Logix.ModuleShape<any, any>,
      ShTarget extends Logix.ModuleShape<any, any>,
      R = unknown,
      V = any,
    >(
      selector: (s: Logix.StateOf<ShSource>) => V,
      map: (value: V) => ReadonlyArray<Logix.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  } = null as unknown as {
    <
      ShSource extends Logix.ModuleShape<any, any>,
      ShTarget extends Logix.ModuleShape<any, any>,
      R = unknown,
      V = any,
    >(
      selector: (s: Logix.StateOf<ShSource>) => V,
      map: (value: V) => Logix.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <
      ShSource extends Logix.ModuleShape<any, any>,
      ShTarget extends Logix.ModuleShape<any, any>,
      R = unknown,
      V = any,
    >(
      selector: (s: Logix.StateOf<ShSource>) => V,
      map: (value: V) => ReadonlyArray<Logix.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  }

  export const onActionDispatch: {
    <
      ShSource extends Logix.ModuleShape<any, any>,
      ShTarget extends Logix.ModuleShape<any, any>,
      R = unknown,
      TSource extends Logix.ActionOf<ShSource> = Logix.ActionOf<ShSource>,
    >(
      predicate: (a: Logix.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => Logix.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <
      ShSource extends Logix.ModuleShape<any, any>,
      ShTarget extends Logix.ModuleShape<any, any>,
      R = unknown,
      TSource extends Logix.ActionOf<ShSource> = Logix.ActionOf<ShSource>,
    >(
      predicate: (a: Logix.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => ReadonlyArray<Logix.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  } = null as unknown as {
    <
      ShSource extends Logix.ModuleShape<any, any>,
      ShTarget extends Logix.ModuleShape<any, any>,
      R = unknown,
      TSource extends Logix.ActionOf<ShSource> = Logix.ActionOf<ShSource>,
    >(
      predicate: (a: Logix.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => Logix.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <
      ShSource extends Logix.ModuleShape<any, any>,
      ShTarget extends Logix.ModuleShape<any, any>,
      R = unknown,
      TSource extends Logix.ActionOf<ShSource> = Logix.ActionOf<ShSource>,
    >(
      predicate: (a: Logix.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => ReadonlyArray<Logix.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  }
}

// ---------------------------------------------------------------------------
// Control：围绕 Effect 的结构化控制流工具集合
// ---------------------------------------------------------------------------

export namespace Control {
  export interface Api<Sh extends Logix.ModuleShape<any, any>, R = never> {
    /**
     * 分支逻辑：封装 if/else 结构，便于平台识别分支边界。
     */
    readonly branch: <A = void, E = any, R2 = any>(opts: {
      if: boolean | Effect.Effect<boolean, E, R2>
      then: Effect.Effect<A, E, R2>
      else?: Effect.Effect<A, E, R2>
    }) => Effect.Effect<A, E, R2>

    /**
     * 错误边界：显式 try/catch 结构。
     */
    readonly tryCatch: <A, E, R2 = any, A2 = A, E2 = any, R3 = R2>(opts: {
      try: Effect.Effect<A, E, R2>
      catch: (err: E) => Effect.Effect<A2, E2, R3>
    }) => Effect.Effect<A | A2, E2, R2 | R3>

    /**
     * 并行执行一组 Effect。
     */
    readonly parallel: <R2 = any>(
      effects: ReadonlyArray<Effect.Effect<any, any, R2>>,
    ) => Effect.Effect<void, any, R2>
  }
}

// ---------------------------------------------------------------------------
// 示例一：计数器 · 最小全链路（Schema → Shape → Logic → Store）
// ---------------------------------------------------------------------------

// 1. 用 Effect.Schema 定义计数器的 State / Action 形状
export const CounterStateSchema = Schema.Struct({
  count: Schema.Number,
})

export const CounterActionMap = {
  inc: Schema.Void,
  dec: Schema.Void,
}

// 2. 基于 Schema 推导出 State / Action 类型 & Store Shape
export type CounterShape = Logix.ModuleShape<
  typeof CounterStateSchema,
  Schema.Schema<Logix.ActionsFromMap<typeof CounterActionMap>>
>

export type CounterState = Logix.StateOf<CounterShape>
export type CounterAction = Logix.ActionOf<CounterShape>

// 3. Logic：在 CounterShape 对应的 Store 上运行的一段逻辑
const $Counter = Logic.forShape<CounterShape>()

export const CounterLogic: Logic.Of<CounterShape> = Effect.gen(function* () {
  // L2: 使用 IntentBuilder (Fluent API)
  yield* Effect.all([
    $Counter.onAction('inc').run(
      $Counter.state.update((prev) => ({ ...prev, count: prev.count + 1 }))
    ),
    $Counter.onAction('dec').run(
      $Counter.state.update((prev) => ({ ...prev, count: prev.count - 1 }))
    ),
  ])
})

// 4. 计数器场景下的 Module / Live 示例：
// - state / actions 由 CounterStateSchema / CounterActionMap 定义；
// - logic 挂载 CounterLogic（内部使用 $.flow + $.state.update）。

export const CounterModule = Logix.Module('CounterModule', {
  state: CounterStateSchema,
  actions: CounterActionMap,
})

export const CounterLive = CounterModule.live(
  { count: 0 },
  CounterLogic,
)

// ---------------------------------------------------------------------------
// 示例二：用户注册页面 · Module + Logic + Flow + 长逻辑封装 全链路
// ---------------------------------------------------------------------------

// 1. 用 Schema 定义「用户注册页面」的 State / Action 形状
export const RegisterStateSchema = Schema.Struct({
  username: Schema.String,
  isSubmitting: Schema.Boolean,
})

export const RegisterActionMap = {
  'form/submit': Schema.Void,
}

export type RegisterShape = Logix.ModuleShape<
  typeof RegisterStateSchema,
  Schema.Schema<Logix.ActionsFromMap<typeof RegisterActionMap>>
>

export type RegisterState = Logix.StateOf<RegisterShape>
export type RegisterAction = Logix.ActionOf<RegisterShape>

// 2. 长逻辑封装：Input C = 普通入参，内部自行约定“借用的形状”

// 本例中，提交逻辑的入参包含依赖与可选配置两部分
export interface RegisterSubmitInput {
  formRef: SubscriptionRef.SubscriptionRef<RegisterState>
  submit: (values: RegisterState) => Effect.Effect<void, never, any>
  showToast?: boolean
}

export const runRegisterSubmit = (input: RegisterSubmitInput) =>
  Effect.gen(function* (_) {
    const values = yield* SubscriptionRef.get(input.formRef)
    yield* input.submit(values)
    if (input.showToast) {
      // 这里可以挂接埋点 / 提示等差异化逻辑
    }
  })

// 3. Logic：在 RegisterShape 对应的 Store 上运行一段逻辑，触发提交长逻辑
//    —— 可以理解为「用户注册场景的 Logic」

const $Register = Logic.forShape<RegisterShape>()

export const UserRegisterSceneLogic: Logic.Of<RegisterShape> = Effect.gen(function* () {
  // 3.1 构造提交逻辑需要的依赖：借用整棵表单状态作为 Ref
  const formStateRef = $Register.state.ref() // SubscriptionRef<RegisterState>
  const input: RegisterSubmitInput = {
    formRef: formStateRef,
    submit: (values) =>
      // 这里用一个占位 Effect，当作调用后端 API
      Effect.sync(() => {
        // 实际项目中可以在这里调用 ApiService.createUser(values) 等
        console.log('submit register form', values)
      }),
    showToast: true,
  }

  // 3.2 L2: 使用 IntentBuilder 编排提交逻辑
  // 语义：当 form/submit 动作触发时，执行 handleSubmit (使用 runExhaust 防止重复提交)
  yield* $Register.onAction('form/submit').runExhaust(
    Effect.gen(function* () {
      // 提交前标记 isSubmitting = true
      yield* $Register.state.update((prev) => ({ ...prev, isSubmitting: true }))
      // 执行通用提交逻辑
      yield* runRegisterSubmit(input)
      // 提交结束后重置 isSubmitting
      yield* $Register.state.update((prev) => ({ ...prev, isSubmitting: false }))
    })
  )
})

// 4. 用户注册场景下的 Module / Live 示例：
// - state / actions 形状来自 RegisterStateSchema / RegisterActionMap；
// - logic 挂载 UserRegisterSceneLogic（内部又使用 Flow + Pattern）。

export const RegisterModule = Logix.Module('RegisterModule', {
  state: RegisterStateSchema,
  actions: RegisterActionMap,
})

export const RegisterLive = RegisterModule.live(
  {
    username: '',
    isSubmitting: false,
  },
  UserRegisterSceneLogic,
)

// Re-export app for easier access
export const app = Logix.app
