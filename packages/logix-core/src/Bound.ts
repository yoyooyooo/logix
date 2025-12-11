import { Context, Effect, Schema, Stream, SubscriptionRef } from "effect"
import type * as Logix from "./internal/module.js"
import type * as Flow from "./Flow.js"
import * as Logic from "./Logic.js"
import * as BoundApiRuntime from "./internal/runtime/BoundApiRuntime.js"

// ---------------------------------------------------------------------------
// BoundApi：为某一类 Store Shape + Env 创建预绑定的访问器
// ---------------------------------------------------------------------------

/**
 * Action API：固定方法 + 动态 Action Dispatcher。
 */
export type ActionsApi<Sh extends Logix.AnyModuleShape, R> = {
  readonly dispatch: (
    action: Logix.ActionOf<Sh>
  ) => Logic.Secured<Sh, R, void, never>
  readonly actions$: Stream.Stream<Logix.ActionOf<Sh>>
} & {
  readonly [K in keyof Sh["actionMap"]]: (
    payload: Schema.Schema.Type<Sh["actionMap"][K]>
  ) => Logic.Secured<Sh, R, void, never>
}

/**
 * RemoteBoundApi：在当前 Logic 中以 Bound 风格访问「其他 Module」的只读句柄。
 *
 * - 与本模块的 `$` 在写法上尽量保持一致（onState / onAction / on / actions）；
 * - 只暴露「读取 + 监听 + 通过 Action 触发改变」的能力，不提供跨模块直接写 State 的入口。
 */
export interface RemoteBoundApi<
  SelfSh extends Logix.AnyModuleShape,
  TargetSh extends Logix.AnyModuleShape,
  R = never
> {
  readonly onState: <V>(
    selector: (s: Logix.StateOf<TargetSh>) => V
  ) => Logic.IntentBuilder<V, SelfSh, R>

  readonly onAction: {
    // 1. 类型守卫谓词
    <T extends Logix.ActionOf<TargetSh>>(
      predicate: (a: Logix.ActionOf<TargetSh>) => a is T
    ): Logic.IntentBuilder<T, SelfSh, R>

    // 2. 通过 _tag / type 字面量匹配某一变体
    <
      K extends Logix.ActionOf<TargetSh> extends { _tag: string }
        ? Logix.ActionOf<TargetSh>["_tag"]
        : never
    >(
      tag: K
    ): Logic.IntentBuilder<
      Extract<Logix.ActionOf<TargetSh>, { _tag: K } | { type: K }>,
      SelfSh,
      R
    >

    // 3. 通过具体 Action 值进行缩小
    <
      A extends Logix.ActionOf<TargetSh> &
        ({ _tag: string } | { type: string })
    >(
      value: A
    ): Logic.IntentBuilder<A, SelfSh, R>

    // 4. 通过 Schema（单一变体 Schema）进行缩小
    <Sc extends Logix.AnySchema>(
      schema: Sc
    ): Logic.IntentBuilder<
      Extract<Logix.ActionOf<TargetSh>, Schema.Schema.Type<Sc>>,
      SelfSh,
      R
    >
  } & {
    [K in keyof TargetSh["actionMap"]]: Logic.IntentBuilder<
      Extract<Logix.ActionOf<TargetSh>, { _tag: K } | { type: K }>,
      SelfSh,
      R
    >
  }

  readonly on: <V>(
    source: Stream.Stream<V>
  ) => Logic.IntentBuilder<V, SelfSh, R>

  /**
   * 基于 selector 读取目标模块的快照。
   * 说明：保持只读，不暴露跨模块写 State 的接口。
   */
  readonly read: <V>(
    selector: (s: Logix.StateOf<TargetSh>) => V
  ) => Effect.Effect<V, never, Logix.ModuleTag<TargetSh>>

  /**
   * 通过目标模块的 Action 进行交互。
   * - 只暴露 actions / actions$，不暴露 state.update/mutate。
   * - 调用方仍然在当前模块的 Logic Env 中运行。
   */
  readonly actions: Logix.ModuleHandle<TargetSh>["actions"]
  readonly actions$: Logix.ModuleHandle<TargetSh>["actions$"]
}

/**
 * Bound API 工厂：为某一类 Store Shape + Env 创建预绑定的访问器。
 *
 * - 默认基于 Logic.RuntimeTag 获取当前 Logix.ModuleRuntime；
 * - 可选传入 Logix.ModuleTag<Sh> 以显式指定 Runtime 来源（例如跨 Store 协作场景）。
 *
 * 说明：本函数仅提供类型签名，具体实现由运行时代码注入，本 PoC 中返回值为占位。
 */
export type BoundApi<Sh extends Logix.AnyModuleShape, R = never> =
  Logix.BoundApi<Sh, R>

export interface BoundApiPublic<Sh extends Logix.AnyModuleShape, R = never> {
  readonly state: {
    readonly read: Logic.Of<Sh, R, Logix.StateOf<Sh>, never>
    readonly update: (
      f: (prev: Logix.StateOf<Sh>) => Logix.StateOf<Sh>
    ) => Logic.Secured<Sh, R, void, never>
    readonly mutate: (
      f: (draft: Logic.Draft<Logix.StateOf<Sh>>) => void
    ) => Logic.Secured<Sh, R, void, never>
    readonly ref: {
      <V = Logix.StateOf<Sh>>(
        selector?: (s: Logix.StateOf<Sh>) => V
      ): SubscriptionRef.SubscriptionRef<V>
    }
  }
  readonly actions: ActionsApi<Sh, R>
  readonly flow: Flow.Api<Sh, R>
  readonly match: <V>(value: V) => Logic.FluentMatch<V>
  readonly matchTag: <V extends { _tag: string }>(
    value: V
  ) => Logic.FluentMatchTag<V>
  /**
   * 生命周期钩子：替代 StoreConfig.lifecycle，在 Logic 中定义初始化与销毁逻辑。
   * 约束：必须处理所有错误 (E=never)。
   */
  readonly lifecycle: {
    readonly onInit: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>
    readonly onDestroy: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>
    /**
     * 错误上报钩子：当 Logic Fiber 发生未捕获 Defect 时触发。
     * 仅用于上报，无法阻止 Scope 关闭。
     */
    readonly onError: (
      handler: (
        cause: import("effect").Cause.Cause<unknown>,
        context: import("./internal/runtime/Lifecycle.js").ErrorContext
      ) => Effect.Effect<void, never, R>
    ) => Logic.Of<Sh, R, void, never>

    // --- Platform Hooks (Proxied to Platform Service) ---

    /**
     * 挂起：当 App/组件 进入后台或不可见时触发。
     * (Requires Platform Layer)
     */
    readonly onSuspend: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>

    /**
     * 恢复：当 App/组件 恢复前台或可见时触发。
     * (Requires Platform Layer)
     */
    readonly onResume: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>

    /**
     * 业务重置：标准化“软重置”信号（如 Logout / Clear Form）。
     * (Requires Platform Layer or Runtime Support)
     */
    readonly onReset: (
      eff: Logic.Of<Sh, R, void, never>
    ) => Logic.Of<Sh, R, void, never>
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
      module: import("./internal/module.js").ModuleInstance<string, Sh2>
    ): Logic.Of<Sh, R, Logix.ModuleHandle<Sh2>, never>
    <Svc, Id = unknown>(
      tag: Context.Tag<Id, Svc>
    ): Logic.Of<Sh, R, Svc, never>
  }
  /**
   * useRemote：以「只读 Bound API」视角访问其他 Module。
   *
   * - 写法上贴近当前模块的 `$`（onState / onAction / on / actions）；
   * - 能读、能监听、能派发 Action，但不能直接跨模块写 State。
   */
  readonly useRemote: <Sh2 extends Logix.AnyModuleShape>(
    module: import("./internal/module.js").ModuleInstance<string, Sh2>
  ) => Logic.Of<Sh, R, RemoteBoundApi<Sh, Sh2, R>, never>

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
      predicate: (a: Logix.ActionOf<Sh>) => a is T
    ): Logic.IntentBuilder<T, Sh, R>

    // 2. 通过 _tag / type 字面量匹配某一变体
    <
      K extends Logix.ActionOf<Sh> extends { _tag: string }
        ? Logix.ActionOf<Sh>["_tag"]
        : never
    >(
      tag: K
    ): Logic.IntentBuilder<
      Extract<Logix.ActionOf<Sh>, { _tag: K } | { type: K }>,
      Sh,
      R
    >

    // 3. 通过具体 Action 值（例如 Actions.inc）进行缩小
    <A extends Logix.ActionOf<Sh> & ({ _tag: string } | { type: string })>(
      value: A
    ): Logic.IntentBuilder<A, Sh, R>

    // 4. 通过 Schema（单一变体 Schema）进行缩小
    <Sc extends Logix.AnySchema>(
      schema: Sc
    ): Logic.IntentBuilder<
      Extract<Logix.ActionOf<Sh>, Schema.Schema.Type<Sc>>,
      Sh,
      R
    >
  } & {
    [K in keyof Sh["actionMap"]]: Logic.IntentBuilder<
      Extract<Logix.ActionOf<Sh>, { _tag: K } | { type: K }>,
      Sh,
      R
    >
  }

  readonly onState: <V>(
    selector: (s: Logix.StateOf<Sh>) => V
  ) => Logic.IntentBuilder<V, Sh, R>

  /**
   * Primary Reducer 注册入口：
   * - 语义：为某个 Action Tag 注册一条同步、纯状态变换的主 reducer；
   * - 实现：直接落到 Runtime 的 `_tag -> (state, action) => state` 映射，而非 watcher / Flow。
   *
   * 约束：
   * - 每个 Action Tag 最多允许一个 primary reducer；重复注册视为错误；
   * - reducer 必须是纯函数，不依赖 Env，不产生 Effect。
   */
  readonly reducer: <
    K extends keyof Sh["actionMap"],
    A extends Extract<
      Logix.ActionOf<Sh>,
      { _tag: K } | { type: K }
    >
  >(
    tag: K,
    reducer: (
      state: Logix.StateOf<Sh>,
      action: A
    ) => Logix.StateOf<Sh>
  ) => Logic.Of<Sh, R, void, never>

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
}

export function make<Sh extends Logix.AnyModuleShape, R = never>(
  shape: Sh,
  runtime: Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
): BoundApiPublic<Sh, R> {
  return BoundApiRuntime.make(shape, runtime) as BoundApiPublic<Sh, R>
}
