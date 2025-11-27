/**
 * v3 Logix 核心类型草案（Store / Logic / Flow）
 *
 * 设计目标：
 * - 以 Effect.Schema 为唯一事实源：State / Action 形状都从 Schema 推导；
 * - Store/Logic/Flow 在类型上是一体的：Logic 通过 Schema 派生的 State / Action 约束自身；
 * - 长逻辑推荐封装为普通的 Effect 函数（pattern-style），通过 Ref / Env“借用”状态。
 *
 * 说明：
 * - 本文件以类型为主，函数实现均为占位（例如返回 `null as unknown as T`），用于感受泛型与推导效果；
 * - 真正的运行时代码可以在此基础上单独实现 / 演进。
 */

import { Effect, Stream, SubscriptionRef, Schema, Scope, Context } from 'effect'

// ---------------------------------------------------------------------------
// Store：以 Schema 为事实源的 State / Action 形状 + 运行时能力
// ---------------------------------------------------------------------------

export namespace Store {
  /**
   * 方便约束：任意 Effect Schema。
   */
  export type AnySchema = Schema.Schema<any, any, any>

  /**
   * 一类 Store 的「Schema 形状」：只关心 stateSchema / actionSchema，
   * 不关心运行时配置细节（initialState / services / logic 等）。
   *
   * 在业务代码中，通常是：
   *
   *   const stateSchema  = Schema.Struct({ ... })
   *   const actionSchema = Schema.Union(...)
   *
   *   type CounterShape = Store.Shape<typeof stateSchema, typeof actionSchema>
   */
  export interface Shape<SSchema extends AnySchema, ASchema extends AnySchema> {
    readonly stateSchema: SSchema
    readonly actionSchema: ASchema
  }

  export type StateOf<Sh extends Shape<any, any>> = Schema.Schema.Type<Sh['stateSchema']>

  export type ActionOf<Sh extends Shape<any, any>> = Schema.Schema.Type<Sh['actionSchema']>

  /**
   * v3：强类型 Store Tag，用于在 Intent.Coordinate / Logic.forShape 中进行类型安全约束。
   *
   * 说明：
   * - Id 类型对本 PoC 不重要，因此统一使用 `any`；
   * - Service 类型固定为当前 Shape 对应的 Runtime。
   */
  export type Tag<Sh extends Shape<any, any>> = Context.Tag<any, Runtime<StateOf<Sh>, ActionOf<Sh>>>

  /**
   * Store 句柄（Store Handle）：
   * - 在 React Adapter / 上层集成中，用于统一接收「Tag 或 Runtime」两种形态；
   * - 作为 Env/DI：通常使用 Store.Tag<Sh> 放入 Layer / Runtime 环境；
   * - 作为局部持有：通常使用 Store.Runtime<StateOf<Sh>, ActionOf<Sh>> 直接在组件或逻辑中传递实例。
   *
   * `useStore` 等上层 API 可以接受 Store.Handle<Sh>，在内部区分 Tag / Runtime 实际类型。
   */
  export type Handle<Sh extends Shape<any, any>> =
    | Runtime<StateOf<Sh>, ActionOf<Sh>>
    | Tag<Sh>

  /**
   * Store 的运行时接口（类似文档中的「Store as Context」），
   * 对 Logic / Flow 暴露读写、订阅与派发能力。
   */
  export interface Runtime<S, A> {
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
    readonly changes$: <V>(selector: (s: S) => V) => Stream.Stream<V>

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

  // ----- 与 docs/specs/runtime-logix/core/02-store.md 对齐的 API 形状 -----
  // 这里用类型占位的“Layer 形状”来模拟 State / Action 的 Layer，
  // 同时展示它们如何与一组 Logic 程序一起被 Store.make 组合。

  export namespace State {
    export interface Layer<S> {
      readonly _tag: 'StateLayer'
      readonly _S: S
    }

    export function make<SSchema extends AnySchema>(
      schema: SSchema,
      initial: Schema.Schema.Type<SSchema>,
    ): Layer<Schema.Schema.Type<SSchema>> {
      return null as unknown as Layer<Schema.Schema.Type<SSchema>>
    }
  }

  export namespace Actions {
    export interface Layer<A> {
      readonly _tag: 'ActionLayer'
      readonly _A: A
    }

    export function make<ASchema extends AnySchema>(schema: ASchema): Layer<Schema.Schema.Type<ASchema>> {
      return null as unknown as Layer<Schema.Schema.Type<ASchema>>
    }
  }

  /**
   * Store.make 最终形态（类型层面）：
   *   const StateLive  = Store.State.make(...)
   *   const ActionLive = Store.Actions.make(...)
   *   const LogicLive  = Logic.make(...)
   *   const MyStore    = Store.make(StateLive, ActionLive, LogicLive)
   *
   * 在本 PoC 中，我们仍然通过 Shape 推导 S/A 类型，但 API 形状与文档保持一致。
   */
  export function make<Sh extends Shape<any, any>, R = never>(
    stateLayer: State.Layer<StateOf<Sh>>,
    actionLayer: Actions.Layer<ActionOf<Sh>>,
    ...logicLayers: Array<Effect.Effect<any, any, any>>
  ): Runtime<StateOf<Sh>, ActionOf<Sh>> {
    return null as unknown as Runtime<StateOf<Sh>, ActionOf<Sh>>
  }
}

// ---------------------------------------------------------------------------
// Logic：在某一类 Store 上长期运行的一段 Effect 程序
// ---------------------------------------------------------------------------

export namespace Logic {
  /**
   * v3：Logic 作用域内用于获取当前 Store.Runtime 的核心 Tag。
   *
   * - 在运行时代码中，Logic.make 会在对应 Scope 内 provide 该 Tag；
   * - 在 Pattern / Namespace 内部，可以通过 `yield* Logic.RuntimeTag` 借用当前 Store 能力。
   *
   * 这里的 Id / Service 类型均为 Runtime<any, any> 的宽类型，具体 Shape 由 Logic.Fx<Sh,R> 约束。
   */
  export const RuntimeTag: Context.Tag<any, Store.Runtime<any, any>> = Context.GenericTag<any, Store.Runtime<any, any>>(
    '@logix/Runtime',
  )

  /**
   * Logic 能看到的环境：
   * - 某一类 Store 运行时能力（通过 Shape 反推出 S / A）；
   * - 额外注入的服务环境 R（通常通过 Context.Tag 定义服务并在 Env 中提供）。
   */
  export type Env<Sh extends Store.Shape<any, any>, R = unknown> =
    Store.Runtime<Store.StateOf<Sh>, Store.ActionOf<Sh>> & R

  /**
   * 严格 Logic Effect 别名：约定 Env 为 Logic.Env<Sh, R>。
   * 用于少量需要精确约束 A/E/R 的场景，其余场景可继续使用裸 Effect。
   * 这是未来正式 API 的一部分，而不是调试专用。
   */
  export type Fx<Sh extends Store.Shape<any, any>, R = unknown, A = void, E = never> = Effect.Effect<A, E, Env<Sh, R>>

  export interface Api<Sh extends Store.Shape<any, any>, R = never> {
    /**
     * State 子域：整棵状态的读 / 写 / Ref 借用。
     *
     * 约束点：
     * - update 语义与 React.setState(fn) 类似：接收「prev -> next」的纯函数；
     * - 如需 mutative 风格更新，使用 mutate(draft => { ... })，由运行时基于 mutative 等库实现；
     * - 细粒度更新可以通过 ref(selector) + SubscriptionRef.update 或外层封装的 helper 完成。
     */
    readonly state: {
      readonly read: Effect.Effect<Store.StateOf<Sh>, never, Env<Sh, R>>
      readonly update: (
        f: (prev: Store.StateOf<Sh>) => Store.StateOf<Sh>,
      ) => Effect.Effect<void, never, Env<Sh, R>>
      /**
       * 使用 mutative 风格更新：接收一个可以“就地修改 draft” 的函数。
       *
       * 运行时实现可以固定选用 mutative，将 draft 修改映射为不可变更新。
       * 调用方推荐写法：
       *
       *   state.mutate(draft => { draft.count += 1 })
       */
      readonly mutate: (f: (draft: Store.StateOf<Sh>) => void) => Effect.Effect<void, never, Env<Sh, R>>
      readonly ref: {
        (): SubscriptionRef.SubscriptionRef<Store.StateOf<Sh>>
        <V>(selector: (s: Store.StateOf<Sh>) => V): SubscriptionRef.SubscriptionRef<V>
      }
    }

    /**
     * Actions 子域：派发与原始 Action 流。
     */
    readonly actions: {
      readonly dispatch: (action: Store.ActionOf<Sh>) => Effect.Effect<void, never, Env<Sh, R>>
      readonly actions$: Stream.Stream<Store.ActionOf<Sh>>
    }

    /**
     * Flow 子域：基于 Runtime 源构造业务流的工具集合。
     * 只负责从 actions / changes 构造 Stream，并把 Effect 跑起来。
     */
    readonly flow: Flow.Api<Sh, R>

    /**
     * Control 子域：围绕 Effect 的结构化控制流工具集合。
     * 负责表达分支、错误边界与并发结构，方便平台进行结构化解析。
     */
    readonly control: Control.Api<Sh, R>
  }

  /**
   * Bound API 工厂：为某一类 Store Shape + Env 创建预绑定的访问器。
   *
   * - 默认基于 Logic.RuntimeTag 获取当前 Store.Runtime；
   * - 可选传入 Store.Tag<Sh> 以显式指定 Runtime 来源（例如跨 Store 协作场景）。
   *
   * 说明：本函数仅提供类型签名，具体实现由运行时代码注入，本 PoC 中返回值为占位。
   */
  export interface BoundApi<Sh extends Store.Shape<any, any>, R = unknown> {
    readonly state: {
      readonly read: Fx<Sh, R, Store.StateOf<Sh>, never>
      readonly update: (f: (prev: Store.StateOf<Sh>) => Store.StateOf<Sh>) => Fx<Sh, R, void, never>
      readonly mutate: (f: (draft: Store.StateOf<Sh>) => void) => Fx<Sh, R, void, never>
      readonly ref: {
        (): SubscriptionRef.SubscriptionRef<Store.StateOf<Sh>>
        <V>(selector: (s: Store.StateOf<Sh>) => V): SubscriptionRef.SubscriptionRef<V>
      }
    }
    readonly actions: {
      readonly dispatch: (action: Store.ActionOf<Sh>) => Fx<Sh, R, void, never>
      readonly actions$: Stream.Stream<Store.ActionOf<Sh>>
    }
    readonly flow: Flow.Api<Sh, R>
    readonly control: Control.Api<Sh, R>
    readonly services: <Svc, Id = any>(tag: Context.Tag<Id, Svc>) => Effect.Effect<Svc, never, R>
  }

  export function forShape<Sh extends Store.Shape<any, any>, R = unknown>(_tag?: Store.Tag<Sh>): BoundApi<Sh, R> {
    // 占位实现：仅用于类型推导，运行时代码会提供真实实现。
    return null as unknown as BoundApi<Sh, R>
  }

  /**
   * 构造一个 Logic.Unit。
   *
   * v3 推荐直接传入已经绑定好 Env 的 Effect（Bound API 模式）：
   *
   *   type CounterShape = Store.Shape<typeof stateSchema, typeof actionSchema>
   *
   *   const CounterLogic = Logic.make<CounterShape>(
   *     Effect.gen(function*(_) {
   *       const $ = Logic.forShape<CounterShape>()
   *       const inc$ = $.flow.fromAction(a => a._tag === "inc")
   *       yield* inc$.pipe(
   *         $.flow.run($.state.update(prev => ({ ...prev, count: prev.count + 1 })))
   *       )
   *     })
   *   )
   *
   * 实际运行时代码内部可以选择以回调形式实现，但该细节不会通过类型暴露给业务代码。
   */
  export function make<
    Sh extends Store.Shape<any, any>,
    R = never,
    FX extends Effect.Effect<any, any, any> = Effect.Effect<any, any, any>,
  >(effect: FX): FX {
    // 占位实现：真正逻辑由运行时代码注入 Env 后提供；Env 形状由调用方自行约束为 Logic.Env<Sh,R>。
    return null as unknown as FX
  }

}

// ---------------------------------------------------------------------------
// Flow：围绕 Store Runtime 源构造业务流的工具集合
// ---------------------------------------------------------------------------

export namespace Flow {
  /**
   * Flow 相关 Effect 默认运行在 Logic.Env 上：
   * - 包含当前 Shape 对应的 Store.Runtime；
   * - 叠加额外服务环境 R。
   *
   * 方便在命名空间级 DSL 中直接使用 Effect 的 DI 能力。
   */
  export type Env<Sh extends Store.Shape<any, any>, R = unknown> = Logic.Env<Sh, R>

  /**
   * 「监听变化然后更新 State」的强语义语法糖签名。
   *
   * 约定：
   * - selector 从整棵 State 中抽取被监听的视图；
   * - reducer 可以是纯函数，也可以返回 Effect：
   *   - 纯函数：直接基于 prev 与当前变化值计算 next；
   *   - Effect：适用于需要先调用 Service 再决定 next 的场景。
   *
   * 所有实现都运行在 Logic.Env 上，内部会使用 Store.Runtime 的 changes$ / setState。
   */
  export interface AndUpdateOnChanges<Sh extends Store.Shape<any, any>, R = never> {
    <V>(
      selector: (s: Store.StateOf<Sh>) => V,
      reducer: (value: V, prev: Store.StateOf<Sh>) => Store.StateOf<Sh>,
    ): Logic.Fx<Sh, R, void, never>
    <V, E, R2>(
      selector: (s: Store.StateOf<Sh>) => V,
      reducer: (value: V, prev: Store.StateOf<Sh>) => Effect.Effect<Store.StateOf<Sh>, E, R2>,
    ): Logic.Fx<Sh, R & R2, void, E>
  }

  /**
   * 「监听某一类 Action 然后更新 State」的强语义语法糖签名。
   *
   * 约定：
   * - predicate 通常为类型守卫，用于筛选某一变体 Action；
   * - reducer 接收当前 Action 与 prev State，返回 next State 或 Effect；
   * - 与 fromAction + run 的组合相比，显式表达了「事件 → 状态更新」意图。
   */
  export interface AndUpdateOnAction<Sh extends Store.Shape<any, any>, R = never> {
    <T extends Store.ActionOf<Sh>>(
      predicate: (a: Store.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Store.StateOf<Sh>) => Store.StateOf<Sh>,
    ): Logic.Fx<Sh, R, void, never>
    <T extends Store.ActionOf<Sh>, E, R2>(
      predicate: (a: Store.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Store.StateOf<Sh>) => Effect.Effect<Store.StateOf<Sh>, E, R2>,
    ): Logic.Fx<Sh, R & R2, void, E>
  }

  export interface Api<Sh extends Store.Shape<any, any>, R = never> {
    /**
     * 从 Action 流中筛选某一类 Action。
     * 通常使用类型守卫缩小为具体变体。
     */
    readonly fromAction: <T extends Store.ActionOf<Sh>>(
      predicate: (a: Store.ActionOf<Sh>) => a is T,
    ) => Stream.Stream<T>

    /**
     * 从 State 的某个 selector 构造变化流。
     */
    readonly fromChanges: <V>(selector: (s: Store.StateOf<Sh>) => V) => Stream.Stream<V>

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
     * Intent 原语：监听 State 某个 selector 的变化，并在每次变化时更新 State。
     *
     * 适用场景：
     * - derived state / UI 衍生标记；
     * - 简单的「根据某个字段变化自动重置/联动另一个字段」。
     *
     * 注意：跨 Store 协调（A 变化驱动 B）推荐使用单独的 Coordinator helper。
     */
    readonly andUpdateOnChanges: AndUpdateOnChanges<Sh, R>

    /**
     * Intent 原语：监听某一类 Action，并在每次触发时更新 State。
     *
     * 适用场景：
     * - 表单提交 / 重置等「事件驱动状态重排」；
     * - Tab / 路由切换等「离散事件触发 UI 状态更新」。
     */
    readonly andUpdateOnAction: AndUpdateOnAction<Sh, R>
  }

  /**
   * 命名空间级 DSL：与 Api.andUpdateOnChanges 语义一致，
   * 但通过 Env<Sh,R> 直接依赖 Store.Runtime，便于在独立模块中封装可复用 Pattern。
   *
   * 典型用法：
   *
   *   const logic = Flow.andUpdateOnChanges<MyShape>()(
   *     s => s.results,
   *     (results, prev) => ({ ...prev, hasResult: results.length > 0 })
   *   );
   */
  export const andUpdateOnChanges: {
    <Sh extends Store.Shape<any, any>, R = never, V = any>(
      selector: (s: Store.StateOf<Sh>) => V,
      reducer: (value: V, prev: Store.StateOf<Sh>) => Store.StateOf<Sh>,
    ): Logic.Fx<Sh, R, void, never>
    <Sh extends Store.Shape<any, any>, R = never, V = any, E = never, R2 = never>(
      selector: (s: Store.StateOf<Sh>) => V,
      reducer: (value: V, prev: Store.StateOf<Sh>) => Effect.Effect<Store.StateOf<Sh>, E, R2>,
    ): Logic.Fx<Sh, R & R2, void, E>
  } = null as unknown as {
    <Sh extends Store.Shape<any, any>, R = never, V = any>(
      selector: (s: Store.StateOf<Sh>) => V,
      reducer: (value: V, prev: Store.StateOf<Sh>) => Store.StateOf<Sh>,
    ): Logic.Fx<Sh, R, void, never>
    <Sh extends Store.Shape<any, any>, R = never, V = any, E = never, R2 = never>(
      selector: (s: Store.StateOf<Sh>) => V,
      reducer: (value: V, prev: Store.StateOf<Sh>) => Effect.Effect<Store.StateOf<Sh>, E, R2>,
    ): Logic.Fx<Sh, R & R2, void, E>
  }

  /**
   * 命名空间级 DSL：与 Api.andUpdateOnAction 语义一致。
   *
   * 用于在独立模块中封装常见「某类 Action 触发状态更新」的 Intent 原语。
   */
  export const andUpdateOnAction: {
    <Sh extends Store.Shape<any, any>, R = never, T extends Store.ActionOf<Sh> = Store.ActionOf<Sh>>(
      predicate: (a: Store.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Store.StateOf<Sh>) => Store.StateOf<Sh>,
    ): Logic.Fx<Sh, R, void, never>
    <
      Sh extends Store.Shape<any, any>,
      R = never,
      T extends Store.ActionOf<Sh> = Store.ActionOf<Sh>,
      E = never,
      R2 = never,
    >(
      predicate: (a: Store.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Store.StateOf<Sh>) => Effect.Effect<Store.StateOf<Sh>, E, R2>,
    ): Logic.Fx<Sh, R & R2, void, E>
  } = null as unknown as {
    <Sh extends Store.Shape<any, any>, R = never, T extends Store.ActionOf<Sh> = Store.ActionOf<Sh>>(
      predicate: (a: Store.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Store.StateOf<Sh>) => Store.StateOf<Sh>,
    ): Logic.Fx<Sh, R, void, never>
    <
      Sh extends Store.Shape<any, any>,
      R = never,
      T extends Store.ActionOf<Sh> = Store.ActionOf<Sh>,
      E = never,
      R2 = never,
    >(
      predicate: (a: Store.ActionOf<Sh>) => a is T,
      reducer: (action: T, prev: Store.StateOf<Sh>) => Effect.Effect<Store.StateOf<Sh>, E, R2>,
    ): Logic.Fx<Sh, R & R2, void, E>
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
    ShSource extends Store.Shape<any, any>,
    ShTarget extends Store.Shape<any, any>,
    R = unknown,
  > = Store.Runtime<Store.StateOf<ShSource>, Store.ActionOf<ShSource>> &
    Store.Runtime<Store.StateOf<ShTarget>, Store.ActionOf<ShTarget>> &
    R

  /**
   * Intent 原语：监听 Source Store 某个 State 视图的变化，并向 Target Store 派发 Action。
   *
   * 典型场景：
   * - SearchStore.results 改变时自动向 DetailStore 派发初始化 Action；
   * - FilterStore 条件变化时通知 ListStore 重新加载。
   */
  export interface OnChangesDispatch<
    ShSource extends Store.Shape<any, any>,
    ShTarget extends Store.Shape<any, any>,
    R = unknown,
  > {
    <V>(
      selector: (s: Store.StateOf<ShSource>) => V,
      map: (value: V) => Store.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <V>(
      selector: (s: Store.StateOf<ShSource>) => V,
      map: (value: V) => ReadonlyArray<Store.ActionOf<ShTarget>>,
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
    ShSource extends Store.Shape<any, any>,
    ShTarget extends Store.Shape<any, any>,
    R = unknown,
  > {
    <TSource extends Store.ActionOf<ShSource>>(
      predicate: (a: Store.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => Store.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <TSource extends Store.ActionOf<ShSource>>(
      predicate: (a: Store.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => ReadonlyArray<Store.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  }

  /**
   * 命名空间级协同 DSL：OnChangesDispatch / OnActionDispatch 的占位实现。
   *
   * 运行时代码可以基于 Store.Runtime.changes$ / actions$ + dispatch 来实现。
   */
  export const onChangesDispatch: {
    <
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = unknown,
      V = any,
    >(
      selector: (s: Store.StateOf<ShSource>) => V,
      map: (value: V) => Store.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = unknown,
      V = any,
    >(
      selector: (s: Store.StateOf<ShSource>) => V,
      map: (value: V) => ReadonlyArray<Store.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  } = null as unknown as {
    <
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = unknown,
      V = any,
    >(
      selector: (s: Store.StateOf<ShSource>) => V,
      map: (value: V) => Store.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = unknown,
      V = any,
    >(
      selector: (s: Store.StateOf<ShSource>) => V,
      map: (value: V) => ReadonlyArray<Store.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  }

  export const onActionDispatch: {
    <
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = unknown,
      TSource extends Store.ActionOf<ShSource> = Store.ActionOf<ShSource>,
    >(
      predicate: (a: Store.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => Store.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = unknown,
      TSource extends Store.ActionOf<ShSource> = Store.ActionOf<ShSource>,
    >(
      predicate: (a: Store.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => ReadonlyArray<Store.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  } = null as unknown as {
    <
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = unknown,
      TSource extends Store.ActionOf<ShSource> = Store.ActionOf<ShSource>,
    >(
      predicate: (a: Store.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => Store.ActionOf<ShTarget>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
    <
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = unknown,
      TSource extends Store.ActionOf<ShSource> = Store.ActionOf<ShSource>,
    >(
      predicate: (a: Store.ActionOf<ShSource>) => a is TSource,
      map: (action: TSource) => ReadonlyArray<Store.ActionOf<ShTarget>>,
    ): Effect.Effect<void, never, Env<ShSource, ShTarget, R>>
  }
}

// ---------------------------------------------------------------------------
// Intent：对外暴露的语义原语门面（L1/L2 层）
// ---------------------------------------------------------------------------

export namespace Intent {
  /**
   * L1 快捷方式：单 Store 内 State → State 联动。
   *
   * 语义等价于 Flow.andUpdateOnChanges，但建议业务代码优先通过 Intent 命名空间访问，
   * 便于平台静态分析与“意图级”可视化。
   */
  export const andUpdateOnChanges: typeof Flow.andUpdateOnChanges = Flow.andUpdateOnChanges

  /**
   * L1 快捷方式：单 Store 内 Action → State 联动。
   *
   * 语义等价于 Flow.andUpdateOnAction。
   */
  export const andUpdateOnAction: typeof Flow.andUpdateOnAction = Flow.andUpdateOnAction

  /**
   * L2：跨 Store 协作原语。
   *
   * 对 Coordinator 命名空间的语义包装，推荐通过 Intent.Coordinate 使用，
   * 以便在代码层显式标记“这里存在跨 Store 依赖”。
   */
  export namespace Coordinate {
    export type Env<
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = never,
    > = Coordinator.Env<ShSource, ShTarget, R>

    export type OnChangesDispatch<
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = never,
    > = Coordinator.OnChangesDispatch<ShSource, ShTarget, R>

    export type OnActionDispatch<
      ShSource extends Store.Shape<any, any>,
      ShTarget extends Store.Shape<any, any>,
      R = never,
    > = Coordinator.OnActionDispatch<ShSource, ShTarget, R>

    export const onChangesDispatch: typeof Coordinator.onChangesDispatch = Coordinator.onChangesDispatch
    export const onActionDispatch: typeof Coordinator.onActionDispatch = Coordinator.onActionDispatch
  }
}

// ---------------------------------------------------------------------------
// Control：围绕 Effect 的结构化控制流工具集合
// ---------------------------------------------------------------------------

export namespace Control {
  export interface Api<Sh extends Store.Shape<any, any>, R = never> {
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
    }) => Effect.Effect<A | A2, E | E2, R2 | R3>

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

export const CounterActionSchema = Schema.Union(
  Schema.Struct({ _tag: Schema.Literal('inc') }),
  Schema.Struct({ _tag: Schema.Literal('dec') }),
)

// 2. 基于 Schema 推导出 State / Action 类型 & Store Shape
export type CounterShape = Store.Shape<typeof CounterStateSchema, typeof CounterActionSchema>

export type CounterState = Store.StateOf<CounterShape>
export type CounterAction = Store.ActionOf<CounterShape>

// 3. Logic：在 CounterShape 对应的 Store 上运行的一段逻辑
const $Counter = Logic.forShape<CounterShape>()

export const CounterLogic = Logic.make<CounterShape>(
  Effect.gen(function* () {
    // 从 Action 流中筛选 inc / dec
    const inc$ = $Counter.flow.fromAction((a): a is { _tag: 'inc' } => a._tag === 'inc')
    const dec$ = $Counter.flow.fromAction((a): a is { _tag: 'dec' } => a._tag === 'dec')

    // 将流与 update 关联起来
    yield* Effect.all([
      inc$.pipe($Counter.flow.run($Counter.state.update((prev) => ({ ...prev, count: prev.count + 1 })))),
      dec$.pipe($Counter.flow.run($Counter.state.update((prev) => ({ ...prev, count: prev.count - 1 })))),
    ])
  }),
)

// 4. 计数器场景下的 Store 实例类型示例：
// - state 形状来自 CounterStateSchema
// - action 形状来自 CounterActionSchema
// - logic 挂载 CounterLogic（内部使用 Flow + Logic.update）

const CounterStateLayer = Store.State.make(CounterStateSchema, { count: 0 })

const CounterActionLayer = Store.Actions.make(CounterActionSchema)

export const CounterStore = Store.make<CounterShape>(CounterStateLayer, CounterActionLayer, CounterLogic)

// ---------------------------------------------------------------------------
// 示例二：用户注册页面 · Store + Logic + Flow + 长逻辑封装 全链路
// ---------------------------------------------------------------------------

// 1. 用 Schema 定义「用户注册页面」的 State / Action 形状
export const RegisterStateSchema = Schema.Struct({
  username: Schema.String,
  isSubmitting: Schema.Boolean,
})

export const RegisterActionSchema = Schema.Union(Schema.Struct({ type: Schema.Literal('form/submit') }))

export type RegisterShape = Store.Shape<typeof RegisterStateSchema, typeof RegisterActionSchema>

export type RegisterState = Store.StateOf<RegisterShape>
export type RegisterAction = Store.ActionOf<RegisterShape>

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

export const UserRegisterSceneLogic = Logic.make<RegisterShape>(
  Effect.gen(function* () {
    // 3.1 从 Action 流中筛选 form/submit
    const submit$ = $Register.flow.fromAction((a): a is { type: 'form/submit' } => a.type === 'form/submit')

    // 3.2 构造提交逻辑需要的依赖：借用整棵表单状态作为 Ref
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

    // 3.3 将 Action 流、提交逻辑和 Logic.update 组合起来
    // 这里直接构造一个 Effect，用于挂在 Flow 上：
    const handleSubmit = Effect.gen(function* (_) {
      // 提交前标记 isSubmitting = true
      yield* $Register.state.update((prev) => ({ ...prev, isSubmitting: true }))
      // 执行通用提交逻辑
      yield* runRegisterSubmit(input)
      // 提交结束后重置 isSubmitting
      yield* $Register.state.update((prev) => ({ ...prev, isSubmitting: false }))
    })

    yield* submit$.pipe($Register.flow.run(handleSubmit))
  }),
)

// 4. 用户注册场景下的 Store 实例类型示例：
// - state 形状来自 RegisterStateSchema
// - action 形状来自 RegisterActionSchema
// - logic 挂载 UserRegisterSceneLogic（内部又使用 Flow + Pattern）

const UserRegisterStateLayer = Store.State.make(RegisterStateSchema, {
  username: '',
  isSubmitting: false,
})

const UserRegisterActionLayer = Store.Actions.make(RegisterActionSchema)

export const UserRegisterStore = Store.make<RegisterShape>(
  UserRegisterStateLayer,
  UserRegisterActionLayer,
  UserRegisterSceneLogic,
)
