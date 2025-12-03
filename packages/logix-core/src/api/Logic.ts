import { Context, Effect, Stream, SubscriptionRef } from "effect"
import type * as Logix from "./Logix.js"
import type * as Flow from "../dsl/FlowBuilder.js"
import { Secured } from "./LogicMiddleware.js"
export * from "./LogicMiddleware.js"

// ---------------------------------------------------------------------------
// Logic：在某一类 Store / Module 上长期运行的一段 Effect 程序
// ---------------------------------------------------------------------------

/**
 * v3：Logic 作用域内用于获取当前 Logix.ModuleRuntime 的核心 Tag。
 *
 * - 在运行时代码中，Module.live 会在对应 Scope 内 provide 该 Tag；
 * - 在 Pattern / Namespace 内部，可以通过 `yield* Logic.RuntimeTag` 借用当前 Store 能力。
 *
 * 这里的 Id / Service 类型均为 Runtime<any, any> 的宽类型，具体 Shape 由 Logic.Of<Sh,R> 约束。
 */
export const RuntimeTag: Context.Tag<any, Logix.ModuleRuntime<any, any>> =
  Context.GenericTag<any, Logix.ModuleRuntime<any, any>>("@logix/Runtime")

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
    readonly onSuspend: (
      eff: Effect.Effect<void, never, any>
    ) => Effect.Effect<void, never, any>
    /**
     * 恢复钩子：当宿主环境从“后台”恢复为“前台/可见”状态时触发。
     */
    readonly onResume: (
      eff: Effect.Effect<void, never, any>
    ) => Effect.Effect<void, never, any>
    /**
     * 重置钩子：用于标准化 logout / clear 等软重置信号。
     */
    readonly onReset?: (
      eff: Effect.Effect<void, never, any>
    ) => Effect.Effect<void, never, any>
  }
}

export const Platform = Context.GenericTag<Platform>("@logix/Platform")

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
export type Of<
  Sh extends Logix.AnyModuleShape,
  R = never,
  A = void,
  E = never
> = Effect.Effect<A, E, Env<Sh, R>>

/**
 * Logic.of：将一段已经在 Logic.Env<Sh,R> 上运行的 Effect 显式标记为 Logic.Of。
 *
 * 说明：
 * - 运行时只是值的透传，不引入额外语义；
 * - 主要用于 Pattern / 库作者在封装 `(input) => Effect` 时，显式标注返回值为 Logic.Of；
 * - 业务代码通常通过 Module.logic(($)=>Effect.gen(...)) 即可，无需直接调用本函数。
 */
export function of<
  Sh extends Logix.AnyModuleShape,
  R = never,
  A = void,
  E = never
>(eff: Effect.Effect<A, E, Env<Sh, R>>): Of<Sh, R, A, E> {
  return eff as Of<Sh, R, A, E>
}

/**
 * L2: Fluent Intent Builder (Isomorphic to Flow.Api)
 * 本质是 Flow.Api 的 Fluent 代理。
 * 它持有内部 Stream，并提供与 Flow.Api 同名的方法来转换或执行它。
 */
export type Draft<T> = {
  -readonly [K in keyof T]: Draft<T[K]>
}

// 智能 andThen：DX 视角的 handler 形状（仅做类型约束，不参与 Parser 白盒语义）
export type AndThenUpdateHandler<
  Sh extends Logix.AnyModuleShape,
  Payload,
  E = any,
  R2 = any
> = (
  prev: Logix.StateOf<Sh>,
  payload: Payload
) => Logix.StateOf<Sh> | Effect.Effect<Logix.StateOf<Sh>, E, R2>

export interface IntentBuilder<
  Payload,
  Sh extends Logix.AnyModuleShape,
  R = never
> {
  // --- Transformations (Proxies to Flow.*) ---

  /** Proxy for `stream.pipe(Flow.debounce(ms))` */
  readonly debounce: (ms: number) => IntentBuilder<Payload, Sh, R>

  /** Proxy for `stream.pipe(Flow.throttle(ms))` */
  readonly throttle: (ms: number) => IntentBuilder<Payload, Sh, R>

  /** Proxy for `stream.pipe(Flow.filter(fn))` */
  readonly filter: (
    predicate: (value: Payload) => boolean
  ) => IntentBuilder<Payload, Sh, R>

  /** Proxy for `stream.pipe(Flow.map(fn))` */
  readonly map: <U>(f: (value: Payload) => U) => IntentBuilder<U, Sh, R>

  // --- Terminators (Proxies to Flow.run*) ---

  /**
   * 串行运行 (Sequential)
   * Proxy for `stream.pipe(Flow.run(effect))`
   */
  readonly run: <A = void, E = never, R2 = unknown>(
    effect:
      | Of<Sh, R & R2, A, E>
      | ((p: Payload) => Of<Sh, R & R2, A, E>)
  ) => Of<Sh, R & R2, void, E>

  /**
   * 并行运行 (Parallel / Unbounded)
   * Proxy for `stream.pipe(Flow.runParallel(effect))`
   */
  readonly runParallel: <A = void, E = never, R2 = unknown>(
    effect:
      | Of<Sh, R & R2, A, E>
      | ((p: Payload) => Of<Sh, R & R2, A, E>)
  ) => Of<Sh, R & R2, void, E>

  /**
   * 最新优先 (Switch / Cancel Previous)
   * Proxy for `stream.pipe(Flow.runLatest(effect))`
   */
  readonly runLatest: <A = void, E = never, R2 = unknown>(
    effect:
      | Of<Sh, R & R2, A, E>
      | ((p: Payload) => Of<Sh, R & R2, A, E>)
  ) => Of<Sh, R & R2, void, E>

  /**
   * 阻塞防重 (Exhaust / Ignore New)
   * Proxy for `stream.pipe(Flow.runExhaust(effect))`
   */
  readonly runExhaust: <A = void, E = never, R2 = unknown>(
    effect:
      | Of<Sh, R & R2, A, E>
      | ((p: Payload) => Of<Sh, R & R2, A, E>)
  ) => Of<Sh, R & R2, void, E>

  /**
   * 手动 fork watcher（低频使用）
   * 语义：在当前 Logic.Env 上启动一个长期运行的 watcher Fiber。
   * 等价于 `Effect.forkScoped($.onAction(...).run(effect))`，但以 Fluent 形式表现。
   */
  readonly runFork: <A = void, E = never, R2 = unknown>(
    effect:
      | Of<Sh, R & R2, A, E>
      | ((p: Payload) => Of<Sh, R & R2, A, E>)
  ) => Of<Sh, R & R2, void, E>

  /**
   * 手动 fork 并行 watcher（低频使用）
   * 语义：在当前 Logic.Env 上启动一个长期运行的并行 watcher Fiber。
   * 等价于 `Effect.forkScoped($.onAction(...).runParallel(effect))`。
   */
  readonly runParallelFork: <A = void, E = never, R2 = unknown>(
    effect:
      | Of<Sh, R & R2, A, E>
      | ((p: Payload) => Of<Sh, R & R2, A, E>)
  ) => Of<Sh, R & R2, void, E>

  // --- Escape Hatch ---
  readonly toStream: () => Stream.Stream<Payload>

  // --- L3 Helpers (Injected by BoundApi) ---
  readonly update: (
    reducer: (prev: Logix.StateOf<Sh>, payload: Payload) => Logix.StateOf<Sh> | Effect.Effect<Logix.StateOf<Sh>, any, any>
  ) => Of<Sh, R, void, never>

  readonly mutate: (
    reducer: (draft: Draft<Logix.StateOf<Sh>>, payload: Payload) => void
  ) => Of<Sh, R, void, never>

  /**
   * DX sugar：智能 andThen。
   *
   * - 运行时会根据 handler/Effect 的形态智能选择 update 或 run 语义；
   * - 类型层面不过度约束，统一视为返回当前模块上的 Logic.Of，以降低使用阻力；
   * - 不属于 Fluent 白盒子集，Parser 默认将其视为 Gray/Black Box。
   */
  readonly andThen: (
    handlerOrEff: unknown,
  ) => Of<Sh, R, void, any>

  readonly pipe: import("effect/Pipeable").Pipeable["pipe"]
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
    handler: (value: V) => Effect.Effect<any, any, any>
  ) => FluentMatch<V>
  readonly otherwise: (
    handler: (value: V) => Effect.Effect<any, any, any>
  ) => Effect.Effect<any, any, any>
  readonly exhaustive: () => Effect.Effect<any, any, any>
}

/**
 * Fluent Match Builder（按 _tag 分支）。
 */
export interface FluentMatchTag<V extends { _tag: string }> {
  readonly tag: <K extends V["_tag"]>(
    tag: K,
    handler: (value: Extract<V, { _tag: K }>) => Effect.Effect<any, any, any>
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
   * - （v3.0 限制）当前仅提供整棵 State 的 `ref()` 视图，如需 selector 级别的 Ref，请通过 `$.state.read` + `$.flow` 或自定义 SubscriptionRef helper 处理。
   */
  readonly state: {
    readonly read: Effect.Effect<Logix.StateOf<Sh>, never, Env<Sh, R>>
    readonly update: (
      f: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>
    ) => Secured<Sh, R, void, never>
    /**
     * 使用 mutative 风格更新：接收一个可以“就地修改 draft” 的函数。
     *
     * 运行时实现可以固定选用 mutative，将 draft 修改映射为不可变更新。
     * 调用方推荐写法：
     *
     *   state.mutate(draft => { draft.count += 1 })
     */
    readonly mutate: (
      f: (draft: Draft<Logix.StateOf<Sh>>) => void
    ) => Secured<Sh, R, void, never>
    readonly ref: {
      (): SubscriptionRef.SubscriptionRef<Logix.StateOf<Sh>>
    }
  }

  /**
   * Actions 子域：派发与原始 Action 流。
   */
  readonly actions: {
    readonly dispatch: (
      action: Logix.ActionOf<Sh>
    ) => Secured<Sh, R, void, never>
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
  readonly matchTag: <V extends { _tag: string }>(
    value: V
  ) => FluentMatchTag<V>
}
