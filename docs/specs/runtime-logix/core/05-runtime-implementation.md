# 实现架构 (Implementation Architecture)

> **Status**: Definitive (v3 Effect-Native)
> **Date**: 2025-11-27
> **Layer**: Core Engine Implementation

本文档详细描述了 Logix 核心引擎的内部实现架构。它解释了：

- `Store.make` 如何将 `State`、`Action` 的 Layer 与一组 Logic 程序组装成一个可运行的状态机；
- `Logix.app` 如何在此基础上构建应用级运行时 (AppRuntime)，作为平台与 React 集成的组合根。

所有 API 和类型定义以 `docs/specs/intent-driven-ai-coding/v3/effect-poc` 中的 PoC 为最新事实源。

## 1. 核心组件 (Core Components)

Logix 引擎本质上是一个 **Effect Layer Runtime**。

1.  **State Layer**: 提供 `Ref<State>` 服务。
2.  **Action Layer**: 提供 `Hub<Action>` 服务。
3.  **Logic 程序**: 消费 State 和 Action，运行 Long-running Fibers（即由 `Logic.make` 定义的一组长生命周期 Effect 程序）。

## 2. 组装流程 (Assembly Process)

当调用 `Store.make(StateLayer, ActionLayer, ...logicPrograms)` 时：

1.  **Layer Composition**: 使用 `Layer.merge` 将 State Layer 和 Action Layer 合并为一个 `StoreLayer`，Logic 程序则在该 Runtime 上启动并托管生命周期（而不是作为 Layer 再次合并）。
2.  **Runtime Creation**: 使用 `Layer.toRuntime` 创建一个 Effect Runtime。
3.  **Scope Management**: 创建一个根 Scope，用于管理整个 Store 的生命周期。

## 3. 逻辑的执行环境 (Logic Execution Environment)

在 v3 范式中，不存在一个独立的 `LogicDSLTag`。`Logic` 本身就是一个 `Effect` 程序，它运行在一个由 `Store.Runtime` 和外部注入服务（`R`）共同构成的 `Logic.Env` 环境中。

当 `Store` 运行时，它会构建这个 `Env`，并提供给所有 `Logic.make` 中定义的程序。`Logic.Api`（即 `state`, `flow`, `control` 等）正是对这个 `Env` 中能力的封装，它在 `Store` 内部实现，并传递给业务逻辑，从而连接了抽象逻辑与真实的运行时。

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
   * 基础设施 Layer：
   * - Http / Router / Config / Logger 等全局服务；
   * - 要求第三个泛型为 never，表示已闭合依赖。
   */
  readonly infra: Layer.Layer<R, any, never>

  /**
   * 全局模块：
   * - 每个模块对应一棵全局 Store；
   * - Tag 与 Runtime 的 S/A 必须在类型上匹配。
   */
  readonly modules: ReadonlyArray<{
    readonly tag: Store.Tag<any>
    readonly runtime: Store.Runtime<any, any>
  }>

  /**
   * 进程 / 守护协程 (Processes)：
   * - 一组长生命周期的 Effect（典型为 Coordinator 或后台监听任务）；
   * - 运行在 App 环境上，通常使用 yield* Tag 访问 Store / Service；
   * - 设计上用于“常驻逻辑”，而非一次性初始化脚本。
   */
  readonly processes: ReadonlyArray<Effect.Effect<void, any, R>>
}

// AppDefinition：在配置基础上补充 Layer 与 Runtime 信息
export interface AppDefinition<R> {
  readonly definition: LogixAppConfig<R>
  readonly layer: Layer.Layer<R, any, never>
  readonly makeRuntime: () => Effect.ManagedRuntime<R>
}
```

> 说明  
> - `modules` 中的 `tag` 类型在实际实现中会约束为 `Store.Tag<Sh>`，`runtime` 为 `Store.Runtime<StateOf<Sh>, ActionOf<Sh>>`，以保证架构层的类型安全；  
> - `processes` 中的 Effect 代表“长生命周期逻辑”，例如跨 Store 协调的 Coordinator，或持续监听环境变化的后台任务。

### 6.2 构建逻辑 (from Blueprint to Layer)

`Logix.app` 的实现本质上是一次有序的 Layer 组合过程：

```ts
function app<R>(config: LogixAppConfig<R>): AppDefinition<R> {
  // 1. 构建环境层 (Environment Layer)
  //    聚合所有基础设施和 Store 实例。
  //    Logix.provide(Tag, Store) 在实现上等价于 Layer.succeed(tag, runtime)。
  const envLayer = Layer.mergeAll(
    config.infra,
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

> 注意  
> 上述代码为概念性伪代码，用于描述 Layer 组合与 Scope 关系；  
> 真正实现时需以本地 `effect` 版本的 API 为准（包括 `ManagedRuntime` 的导入路径与签名）。

### 6.3 依赖顺序与生命周期 (Dependency & Lifetime)

`Logix.app` 在语义上遵循如下顺序：

1. **依赖初始化顺序**：`infra` → `modules` → `processes`。  
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
微观层使用 `Store.make` / `Logic.make` 组织行为，宏观层使用 `Logix.app` 组织模块与跨模块协作。

### 6.4 已知局限与取舍 (Known Trade-offs)

当前的 `Logix.app` 设计在平台可解析性与工程灵活性之间做了一些有意识的取舍：

- **进程语义**：  
  - `processes` 专门用于描述“长生命周期的守护进程 / 协调逻辑”，例如 `SearchDetailCoordinator`；  
  - 一次性初始化脚本（如简单的日志打印、一次性的配置读取）建议放在 Infra 构建层或具体 Store/Logic 中，而非 `processes`。
- **Bundle 体积**：  
  - 由于 `Logix.app` 是静态蓝图，`modules` 中引用的所有 Store 实现会被打入主 Bundle；  
  - 对于非常大的前端应用，这会增加首屏体积，但换来的是平台在“静态模式”下即可完整分析应用拓扑。
- **Infra 黑盒**：  
  - `infra` 字段仍然是一个任意的 `Layer.Layer<R, any, never>`，平台不会尝试解析其中的服务细节；  
  - 这样可以保留 Effect-Native 的完全表达力，同时将拓扑解析的范围聚焦在 `modules` / `processes` 这两类结构化资产上。
