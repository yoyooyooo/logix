# 实现架构 (Implementation Architecture)

> **Status**: Definitive (v3 Effect-Native)
> **Date**: 2025-11-27
> **Layer**: Core Engine Implementation

本文档详细描述了 Logix 核心引擎的内部实现架构。它解释了：

- `ModuleRuntime.make` 如何将 `State`、`Action` 的 Layer 与一组 Logic 程序组装成一个可运行的状态机；
- `Logix.app` 如何将多个 Module 组装成一个 AppRuntime；
- Scope 管理与资源释放机制。 React 集成的组合根。

所有 API 和类型定义以 `docs/specs/intent-driven-ai-coding/v3/effect-poc` 中的 PoC 为最新事实源。

## 1. 核心组件 (Core Components)

Logix 引擎本质上是一个 **Effect Layer Runtime**。

1.  **State Layer**: 提供 `Ref<State>` 服务。
2.  **Action Layer**: 提供 `Hub<Action>` 服务。
3.  **Logic 程序**: 消费 State 和 Action，运行 Long-running Fibers（即一组在 `Logic.Env` 上运行的长生命周期 Effect 程序）。

## 2. 组装流程 (Assembly Process)

当调用 `Logix.Module("Id", { state, actions }).live(initialState, ...logicPrograms)` 时，内部大致等价于：

1.  **Layer Composition**: 使用 `Layer.merge` 将 State Layer 和 Action Layer 合并为一个 `StoreLayer`，Logic 程序则在该 Runtime 上启动并托管生命周期（而不是作为 Layer 再次合并）。
2.  **Runtime Creation**: 使用 `Layer.toRuntime` 创建一个基于领域模块运行时实例的 Effect Runtime。
3.  **Scope Management**: 创建一个根 Scope，用于管理该 Module 对应 Store 的生命周期。

## 3. 逻辑的执行环境 (Logic Execution Environment)

在 v3 范式中，不存在一个独立的 `LogicDSLTag`。`Logic` 本身就是一个 `Effect` 程序，它运行在一个由模块运行时和外部注入服务（`R`）共同构成的 `Logic.Env` 环境中。

当 `Store` 运行时，它会构建这个 `Env`，并提供给所有基于 Bound API `$` 定义的 Logic 程序（例如 `Domain.logic(($)=>Effect.gen(...))`）。`Logic.Api`（即 `state`, `flow`, `control` 等）正是对这个 `Env` 中能力的封装，它在 `Store` 内部实现，并传递给业务逻辑，从而连接了抽象逻辑与真实的运行时。

## 4. 并发与流 (Concurrency & Streams)

在 v3 架构中，Flow 本质上是 **Effect Stream**。

*   `Flow.from(trigger)` 创建一个 Stream。
*   `Flow.run(effect)` 使用 `Stream.runForEach` 消费这个 Stream。
*   并发控制（Switch/Queue）通过 `Stream.mapEffect` 的并发参数实现。

## 5. 资源清理 (Resource Disposal)

当 Store 被销毁时，根 Scope 被关闭。Effect Runtime 自动：

1.  取消所有 Logic Fiber。
2.  关闭 Action Hub。
3.  释放所有资源。

## 6. AppRuntime 实现 (Logix.app)

`Logix.app` 是应用级运行时的构建工厂。它负责将“图纸”（配置）转换为“施工”（Layer + Runtime），提供统一的 **Composition Root**。

### 6.1 配置与返回值 (Config & AppDefinition)

在类型层面，我们将 App 定义约束为一组结构化配置：

```ts
// App 配置：用于“画图纸”，不直接包含 Runtime 细节
export interface LogixAppConfig<R> {
  /**
   * 基础环境 Layer：
   * - Http / Router / Config / Logger / Platform 等全局服务；
   * - 要求第三个泛型为 never，表示已闭合依赖。
   */
  readonly layer: Layer.Layer<R, any, never>

  /**
   * 全局模块：
   * - 每个模块对应一棵全局 Store；
   * - Tag 与 Runtime 的 S/A 必须在类型上匹配。
   */
  readonly modules: ReadonlyArray<{
    readonly tag: Logix.ModuleTag<any>
    readonly runtime: any
  }>

  /**
   * 进程 / 守护协程 (Processes)：
   * - 一组长生命周期的 Effect（典型为 Coordinator 或后台监听任务）；
   * - 运行在 App 环境上，通常使用 yield* Tag 访问 Store / Service；
   * - 设计上用于“常驻逻辑”，而非一次性初始化脚本。
   */
  readonly processes: ReadonlyArray<Effect.Effect<void, any, R>>

  /**
   * 全局错误处理：
   * - 当 App Runtime 内任意 Fiber (Module Logic 或 Process) 发生未捕获 Defect 时触发；
   * - 仅用于上报 (Last-breath reporting)，无法阻止 App 崩溃。
   */
  readonly onError?: (cause: import('effect').Cause.Cause<unknown>) => Effect.Effect<void>
}

// AppDefinition：在配置基础上补充 Layer 与 Runtime 信息
export interface AppDefinition<R> {
  readonly definition: LogixAppConfig<R>
  readonly layer: Layer.Layer<R, any, never>
  readonly makeRuntime: () => Effect.ManagedRuntime<R>
}
```

> 说明
> - `modules` 中的 `tag` 类型在实际实现中会约束为 `Logix.ModuleTag<Sh>`，`runtime` 为对应的领域模块运行时实例，以保证架构层的类型安全；
> - `processes` 中的 Effect 代表“长生命周期逻辑”，例如跨 Store 协调的 Coordinator，或持续监听环境变化的后台任务。

### 6.2 构建逻辑 (from Blueprint to Layer)

`Logix.app` 的实现本质上是一次有序的 Layer 组合过程：

```ts
function app<R>(config: LogixAppConfig<R>): AppDefinition<R> {
  // 1. 构建环境层 (Environment Layer)
  //    聚合所有基础设施和 Store 实例。
  //    Logix.provide(Tag, Store) 在实现上等价于 Layer.succeed(tag, runtime)。
  const envLayer = Layer.mergeAll(
    config.layer,
    ...config.modules.map((m) => Layer.succeed(m.tag, m.runtime)),
  )

  // 2. 构建进程层 (Process Layer)
  //    processes 中的 Effect 运行在 envLayer 提供的环境上，以 forkScoped 形式挂到根 Scope。
  const processLayer = Layer.scopedDiscard(
    Effect.all(
      config.processes.map((eff) => Effect.forkScoped(eff)),
      { concurrency: 'unbounded' as const },
    ),
  ).pipe(
    Layer.provide(envLayer), // 注入前面构造好的环境
  )

  // 3. 合并最终 Layer
  //    对外暴露 envLayer 的能力，同时内部运行着 processes 代表的长逻辑。
  const finalLayer = Layer.merge(envLayer, processLayer)

  return {
    definition: config,
    layer: finalLayer,
    makeRuntime: () => Effect.ManagedRuntime.make(finalLayer),
  }
}
```

//## 1. 核心组装工厂：`ModuleRuntime.make`

`ModuleRuntime.make` 是 Logix 引擎的“心脏”。它负责将静态的 Schema、Logic 和初始状态“活化”为一个运行时的 `Logix.ModuleRuntime` 实例。

### 1.1 输入与输出

```ts
function ModuleRuntime.make<Sh extends Logix.ModuleShape<any, any>>(
  stateLayer: Logix.State.Layer<Logix.StateOf<Sh>>,
  actionLayer: Logix.Actions.Layer<Logix.ActionOf<Sh>>,
  ...logicLayers: Array<Logic.Of<Sh, any, any, any>>
): Logix.ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>
```

### 1.2 内部流程

当 `ModuleRuntime.make` 被调用时（通常是在 `Effect.scoped` 上下文中），它会按以下顺序执行：

1.  **State 初始化**：基于 `stateLayer` 创建 `SubscriptionRef`，持有当前状态。
2.  **Action 通道建立**：基于 `actionLayer` 创建 `PubSub`，作为 Action 的总线。
3.  **Runtime 构造**：组装 `getState`、`dispatch`、`actions$` 等 API，形成 `Logix.ModuleRuntime` 对象。
4.  **Logic 启动**：
    - 将 `Logix.ModuleRuntime` 注入给所有传入的 `logicLayers`；
    - 并发启动这些 Logic Effect（`Effect.forkScoped`）；
    - 任何 Logic 的失败都会导致整个 Scope 的关闭（Fail Fast）。

---

## 2. `Logix.app`：应用级组装

如果说 `ModuleRuntime.make` 是单个器官的制造者，那么 `Logix.app` 就是组装整个人体的医生。

### 2.1 职责

- **Flattening**：将所有模块的依赖（Imports）和自身（Providers）拍平到同一层 Layer。
- **Scope Root**：创建应用的根 Scope，管理所有全局 Service 和 Global Store 的生命周期。
- **Entry Point**：提供 `run` 方法，作为 React `RuntimeProvider` 的输入。

### 2.2 实现草图

```ts
function Logix.app(def: AppDefinition) {
  // 1. 拍平依赖
  const layer = flattenLayers(def.imports, def.providers)

  // 2. 构造 Runtime
  const runtime = ManagedRuntime.make(layer)

  return runtime
}
```

> **注意**：`Logix.app` 并不直接调用 `ModuleRuntime.make`，而是通过组合 `Module.live` 返回的 Layer 来间接触发它。

---

## 3. Scope 管理与资源释放

Logix v3 严格遵循 Effect 的 Scope 机制：

- **Global Store**：
  - 生命周期绑定在 `Logix.app` 创建的根 Scope 上。
  - App 关闭时，根 Scope 关闭，触发所有 Global Store 的 `onDestroy`。

- **Local Store**：
  - 生命周期绑定在 React 组件创建的临时 Scope 上（通过 `useLocalStore`）。
  - 组件卸载时，临时 Scope 关闭，触发 Local Store 的 `onDestroy`。

这种机制保证了无论是全局还是局部状态，其资源（如 WebSocket 连接、定时器）都能被精确、自动地释放。成功初始化后，`processes` 中的进程才会启动；
   - 若某个模块初始化失败，`processes` 将不会被执行，AppRuntime 的构建会以错误告终。
2. **生命周期绑定**：
   - `finalLayer` 通常作为应用根节点的 Runtime 入口：
     - React 场景：由 `RuntimeProvider app={AppDefinition}` 持有其 Scope；
     - Node / CLI 场景：通过 `makeRuntime()` 创建的 Runtime 持有其 Scope。

> 注意
> 上述代码为概念性伪代码，用于描述 Layer 组合与 Scope 关系；
> 真正实现时需以本地 `effect` 版本的 API 为准（包括 `ManagedRuntime` 的导入路径与签名）。

### 6.3 依赖顺序与生命周期 (Dependency & Lifetime)

`Logix.app` 在语义上遵循如下顺序：

1. **依赖初始化顺序**：`layer` → `modules` → `processes`。
   - 只有在所有基础设施与 Store 都成功初始化后，`processes` 中的进程才会启动；
   - 若某个模块初始化失败，`processes` 将不会被执行，AppRuntime 的构建会以错误告终。
2. **生命周期绑定**：
   - `finalLayer` 通常作为应用根节点的 Runtime 入口：
     - React 场景：由 `RuntimeProvider app={AppDefinition}` 持有其 Scope；
     - Node / CLI 场景：通过 `makeRuntime()` 创建的 Runtime 持有其 Scope。
   - 当应用卸载或进程退出时：
     - `processes` 中通过 `forkScoped` 启动的所有进程会自动收到中断信号并优雅退出；
     - 所有挂在 App 根 Scope 下的 Store / Service 资源均会被释放。

通过这种方式，Logix 在保持 Effect-Native 运行时特性的同时，为平台与 React/Form 层提供了一个稳定的 **App 级组合契约**：
微观层使用 `Logix.Module` / Bound API `$` 组织行为，宏观层使用 `Logix.app` 组织模块与跨模块协作。

### 6.4 已知局限与取舍 (Known Trade-offs)

当前的 `Logix.app` 设计在平台可解析性与工程灵活性之间做了一些有意识的取舍：

- **进程语义**：
  - `processes` 专门用于描述“长生命周期的守护进程 / 协调逻辑”，例如 `SearchDetailCoordinator`；
  - 一次性初始化脚本（如简单的日志打印、一次性的配置读取）建议放在 Infra 构建层或具体 Store/Logic 中，而非 `processes`。
- **Bundle 体积**：
  - 由于 `Logix.app` 是静态蓝图，`modules` 中引用的所有 Store 实现会被打入主 Bundle；
  - 对于非常大的前端应用，这会增加首屏体积，但换来的是平台在“静态模式”下即可完整分析应用拓扑。
- **Layer 黑盒**：
  - `layer` 字段仍然是一个任意的 `Layer.Layer<R, any, never>`，平台不会尝试解析其中的服务细节；
  - 这样可以保留 Effect-Native 的完全表达力，同时将拓扑解析的范围聚焦在 `modules` / `processes` 这两类结构化资产上。
