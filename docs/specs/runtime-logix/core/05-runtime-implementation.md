# 实现架构 (Implementation Architecture)

> **Status**: Definitive (v3 Effect-Native)
> **Date**: 2025-11-27
> **Layer**: Core Engine Implementation

本文档详细描述了 Logix 核心引擎的内部实现架构。它解释了：

- 通过一个推荐实现草图，说明 `ModuleRuntime.make` 如何将 `State`、`Action` 的 Layer 与一组 Logic 程序组装成一个可运行的状态机；
- AppRuntime（`makeApp`）如何将多个 Module 组装成一个 AppRuntime；
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

*   `Flow.from(trigger)` 创建一个 Stream；
*   `Flow.run(effect)` 使用 `Stream.runForEach` 消费这个 Stream（单 watcher 内串行执行）；
*   `Flow.runParallel(effect)` 使用 `Stream.mapEffect(..., { concurrency: "unbounded" })` + `Stream.runDrain` 实现显式无界并发；
*   其它并发控制（Latest/Exhaust/Sequence）通过 `Stream.flatMap`、内部 Ref 等方式在单 watcher 内约束并发行为。

## 5. 资源清理 (Resource Disposal)

当 Store 被销毁时，根 Scope 被关闭。Effect Runtime 自动：

1.  取消所有 Logic Fiber。
2.  关闭 Action Hub。
3.  释放所有资源。

## 6. Runtime 容器实现 (LogixRuntime / AppRuntime)

`LogixRuntime` 是 v3 分形 Runtime 下对外暴露的应用级运行时构建工厂；它以某个 **Root ModuleImpl** 为中心，将「图纸」（ModuleImpl.layer + processes）转换为「施工」（Layer + Runtime），提供统一的 **Composition Root**。  
AppRuntime（基于 `LogixAppConfig` / `AppDefinition`）则作为内部实现细节存在，主要服务于平台解析与运行时组合，不再建议业务代码直接调用。

### 6.1 配置与返回值 (Config & AppDefinition)

在实现层面，我们仍然通过一组结构化配置（`LogixAppConfig` / `AppDefinition`）来描述 AppRuntime 的内部形态，并在其之上封装对外的 `LogixRuntime.make(rootImpl, options)`：

```ts
// App 配置：用于“画图纸”，不直接包含 Runtime 细节
export interface LogixAppConfig<R> {
  /**
   * 基础环境 Layer：
   * - Http / Router / Config / Logger / Platform 等全局服务；
   * - 要求第三个泛型为 never，表示已闭合依赖；
   * - 推荐在进入 AppRuntime.makeApp / LogixRuntime.make 之前就收敛错误通道，使这里的 E=never。
  */
  readonly layer: Layer.Layer<R, never, never>

  /**
   * 全局模块：
   * - 每个模块对应一棵全局 Store；
   * - Module 定义与 Runtime 的 S/A 必须在类型上匹配。
   */
  readonly modules: ReadonlyArray<AppModuleEntry>

  /**
   * AppModuleEntry：由 AppRuntime.provide 生成的模块条目。
   *
   * 说明：
   * - module：Module 定义对象（既是 Tag，又携带 Shape 信息与工厂能力）；
   * - layer：该 Module 对应的 Runtime Layer，通常由 Module.live(initial, ...logics) 返回。
   *
   * 在实际实现中，AppRuntime.provide 会负责将 “Module + Runtime/Layer” 配对为 AppModuleEntry。
   */
  interface AppModuleEntry {
    readonly module: Logix.ModuleInstance<any, any>
    readonly layer: Layer.Layer<any, any, any>
  }

  /**
   * 进程 / 守护协程 (Processes)：
   * - 一组长生命周期的 Effect（典型为 Coordinator 或后台监听任务）；
   * - 运行在 App 环境上，通常使用 yield* Tag 访问 Store / Service；
   * - 设计上用于“常驻逻辑”，而非一次性初始化脚本。
   */
  readonly processes: ReadonlyArray<Effect.Effect<void, any, any>>

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
  readonly layer: Layer.Layer<R, never, never>
  readonly makeRuntime: () => Effect.ManagedRuntime<R, never>
}
```

> 说明
> - `modules` 由 AppRuntime.provide(Module, Module.live(...)) 或等价 Layer 组合而成，在当前实现中对于 `LogixRuntime.make` 来说通常只有一个入口模块（Root ModuleImpl 对应的 Module）；
> - `processes` 中的 Effect 代表“长生命周期逻辑”，例如跨 Store 协调的 Coordinator，或持续监听环境变化的后台任务；在分形 Runtime 模型下，它们通常来源于 Root ModuleImpl 的 `processes` 字段。

### 6.2 构建逻辑 (from Blueprint to Layer)

AppRuntime 的 `makeApp` 实现本质上是一次有序的 Layer 组合过程：

```ts
function makeApp<R>(config: LogixAppConfig<R>): AppDefinition<R> {
  const moduleLayers = config.modules.map((entry) => entry.layer)
  const envLayer = moduleLayers.length > 0
    ? Layer.mergeAll(config.layer, ...moduleLayers)
    : config.layer

  const finalLayer = Layer.scopedContext(
    Effect.gen(function* () {
      const scope = yield* Scope.make()
      const env = yield* Layer.buildWithScope(envLayer, scope)
      yield* Effect.addFinalizer(() => Scope.close(scope, Exit.void))

      yield* Effect.forEach(config.processes, (process) =>
        Effect.forkScoped(Effect.provide(process, env))
      )

      return env
    })
  )

  return {
    definition: config,
    layer: finalLayer,
    makeRuntime: () => Effect.ManagedRuntime.make(finalLayer),
  }
}
```

## 1. 核心组装工厂：`ModuleRuntime.make`（推荐实现草图）

`ModuleRuntime.make` 是 Logix 引擎的“心脏”。它负责将静态的 Schema、Logic 和初始状态“活化”为一个运行时的 `Logix.ModuleRuntime` 实例。

> **规范层说明**
> - 本节给出的 `ModuleRuntime.make` 签名是一种 **推荐的实现草图**，方便解释标准实现可以如何拆分 State / Actions / Logic；
> - **不是唯一合法的构造入口**：实现方可以选择其它工厂形态（例如 `make(initialState)`），只要最终得到的 `ModuleRuntime<S, A>` 满足 1.3 小节所定义的接口与语义不变式，即视为规范合规。

### 1.1 输入与输出

```ts
function ModuleRuntime.make<Sh extends Logix.ModuleShape<any, any>>(
  initial: Logix.StateOf<Sh>,
  options?: {
    readonly createState?: Effect.Effect<SubscriptionRef<Logix.StateOf<Sh>>>
    readonly createActionHub?: Effect.Effect<PubSub<Logix.ActionOf<Sh>>>
    readonly logics?: ReadonlyArray<Logic.Of<Sh, any, any, any>>
    readonly tag?: Logix.ModuleTag<Sh>
  }
): Effect<ModuleRuntime<Logix.StateOf<Sh>, Logix.ActionOf<Sh>>>
```

> 业务侧在多数场景下只需要提供 `initial`；`createState` / `createActionHub` 则用于自定义状态来源（例如来自其它 Layer 或远程 Store），其 Effect 往往由 `Layer.buildWithScope(...)` 得到。  
> 因此，`ModuleRuntime.make` 同时覆盖了“直接传初始值”与“显式给出 state/action Layer”两条路径。

### 1.2 内部流程

当 `ModuleRuntime.make` 被调用时（通常是在 `Effect.scoped` 上下文中），它会按以下顺序执行：

1.  **State 初始化**：若提供了 `createState`（例如通过 `Layer.buildWithScope` 从自定义 Store 获得），则直接复用；否则根据 `initial` 创建默认的 `SubscriptionRef`。
2.  **Action 通道建立**：同理，`createActionHub` 可以让调用方注入已有的 Action 通道，默认实现为 `PubSub.unbounded()`。
3.  **Runtime 构造**：组装 `getState`、`dispatch`、`actions$` 等 API，形成 `Logix.ModuleRuntime` 对象。
4.  **Logic 启动**：
    - 将 `Logix.ModuleRuntime` 注入给所有传入的 `logicLayers`；
    - 并发启动这些 Logic Effect（`Effect.forkScoped`）；
    - 任何 Logic 的失败都会导致整个 Scope 的关闭（Fail Fast）。

### 1.3 扩展点：自定义 `ModuleRuntime` 的边界

从架构上看，`ModuleRuntime<S, A>` 是 Logix 运行时的核心接口，**允许被替换/自定义，但只面向引擎实现者与适配器作者**：

- 语义不变式（任何自定义实现都必须满足）：
  - `getState` / `setState`：反映一棵单一、严格一致的 State 树；`setState` 之后后续的 `getState` / `changes` 必须能观测到新值；
  - `dispatch` 与 `actions$`：所有通过 `dispatch` 派发的 Action 必须按顺序出现在 `actions$` 流中，不允许静默丢失或跨实例/跨模块串台；
  - `changes(selector)`：是基于 State 视图的变化流，语义等价于“`stateRef.changes` + `distinctUntilChanged(selector)`”，不能混入无关事件；
  - `ref()`：提供对当前 State 的 `SubscriptionRef` 视图：
    - `ref()` 返回整棵 State 的可读写 SubscriptionRef；
    - `ref(selector)` 在当前 PoC 中返回一个**只读派生视图**（基于 selector 从整棵 State 派生值，写入会导致运行时 `die`），主要供引擎内部与高级 Pattern 使用；业务代码仍推荐优先通过 `$.onState` / `$.flow` 订阅变化，或在必要时在调用方自行封装更语义化的 Ref。
- 典型合法用例：
  - 为“远程 Store / 既有状态机”（例如后端推送的只读 Store、Redux/Zustand 等）包装一个 `ModuleRuntime`，让 Logix 逻辑可以在它之上运行；
  - 在测试环境中实现带时间旅行 / 录制能力的 `ModuleRuntime`，用于调试与回放；
  - 为特殊平台实现“懒加载 / 分片持久化”等高级特性，但对 Logic / Flow 保持完全透明。
- 明确**不推荐**的用法：
  - 在业务模块内部为每个 Module 自行造一套“特立独行”的 Runtime；这会破坏平台统一的调试/观测能力，也会让 Intent/Flow 录制难以复用。

因此，日常业务开发应统一通过 `Logix.Module` + `Module.logic` + `Module.live` 使用引擎提供的标准 `ModuleRuntime` 实现；只有在实现适配层 / 平台扩展时，才在本文件约束下自定义 `ModuleRuntime`，并通过 Root ModuleImpl + `LogixRuntime.make`（或内部 AppRuntime 组合）注入到应用级 Runtime 中。

> 换句话说：  
> - **硬约束** 只落在 `ModuleRuntime<S, A>` 接口与上述语义不变式上；  
> - `ModuleRuntime.make` / Adapter / Layer 组合等都属于 **可选的构造路径**，实现方可根据工程需要自由选择或封装。

---

## 2. AppRuntime.makeApp：应用级组装

如果说 `ModuleRuntime.make` 是单个器官的制造者，那么 `LogixRuntime`（内部基于 `AppRuntime.makeApp` 实现）就是组装整个人体的医生。

### 2.1 职责（逻辑模型）

- **Flattening**：将所有模块的依赖（Imports）和自身（Providers）拍平到同一层 Layer。
- **Scope Root**：创建应用的根 Scope，管理所有全局 Service 和 Global Store 的生命周期。
- **Entry Point**：提供 `run` 方法，作为 React `RuntimeProvider` 的输入。

在 v3 Effect-Native 实现中，AppRuntime 还有一个 **硬约束职责**：

- **TagIndex / Tag 冲突检测**：
  - 在合并所有模块 Layer 之前，AppRuntime 会构建一份 `TagIndex`，收集：
    - 每个模块自身的 Runtime Tag（`ModuleInstance` 作为 Tag）；
    - 通过 `AppRuntime.provideWithTags` 显式声明的 Service Tag 列表。
  - 一旦发现同一个 Tag Key 被多个不同模块声明，AppRuntime 必须抛出带 `_tag: "TagCollisionError"` 与 `collisions` payload 的错误，禁止依赖 `Layer.mergeAll` 顺序进行静默覆盖；
  - 该行为是 v3 的 Hard Constraint，后续 DevTools / Universe View 会在此基础上扩展 Env 拓扑与 TagIndex 可视化能力（见 `impl/app-runtime-and-modules.md` 与 L9 TagIndex 草案）。

### 2.2 实现草图

```ts
function makeRuntimeFromDefinition(def: AppDefinition) {
  // 1. 拍平依赖
  const layer = flattenLayers(def.imports, def.providers)

  // 2. 构造 Runtime
  const runtime = ManagedRuntime.make(layer)

  return runtime
}
```

> **注意**：`makeApp` 并不直接调用 `ModuleRuntime.make`，而是通过组合 `Module.live` 返回的 Layer 来间接触发它。

---

## 3. Scope 管理与资源释放

Logix v3 严格遵循 Effect 的 Scope 机制：

- **Global Store**：
  - 生命周期绑定在应用级 Runtime（`LogixRuntime` / 内部 AppRuntime）创建的根 Scope 上。
  - App 关闭时，根 Scope 关闭，触发所有 Global Store 的 `onDestroy`。

- **Local Store**：
  - 生命周期绑定在 React 组件创建的临时 Scope 上（通过 `useLocalStore`）。
  - 组件卸载时，临时 Scope 关闭，触发 Local Store 的 `onDestroy`。

这种机制保证了无论是全局还是局部状态，其资源（如 WebSocket 连接、定时器）都能被精确、自动地释放。成功初始化后，`processes` 中的进程才会启动；
   - 若某个模块初始化失败，`processes` 将不会被执行，AppRuntime 的构建会以错误告终。
2. **生命周期绑定**：
   - `finalLayer` 通常作为应用根节点的 Runtime 入口：
     - React 场景：由 `RuntimeProvider runtime={LogixRuntime.make(...).runtime}`（或等价封装）持有其 Scope；
     - Node / CLI 场景：通过 `makeRuntime()` 创建的 Runtime 持有其 Scope。

> 注意
> 上述代码为概念性伪代码，用于描述 Layer 组合与 Scope 关系；
> 真正实现时需以本地 `effect` 版本的 API 为准（包括 `ManagedRuntime` 的导入路径与签名）。

### 6.3 依赖顺序与生命周期 (Dependency & Lifetime)

AppRuntime 在语义上遵循如下顺序：

1. **依赖初始化顺序**：`layer` → `modules` → `processes`。
   - 只有在所有基础设施与 Store 都成功初始化后，`processes` 中的进程才会启动；
   - 若某个模块初始化失败，`processes` 将不会被执行，AppRuntime 的构建会以错误告终。
2. **生命周期绑定**：
   - `finalLayer` 通常作为应用根节点的 Runtime 入口：
     - React 场景：由 `RuntimeProvider runtime={LogixRuntime.make(...).runtime}`（或等价封装）持有其 Scope；
     - Node / CLI 场景：通过 `makeRuntime()` 创建的 Runtime 持有其 Scope。
   - 当应用卸载或进程退出时：
     - `processes` 中通过 `forkScoped` 启动的所有进程会自动收到中断信号并优雅退出；
     - 所有挂在 App 根 Scope 下的 Store / Service 资源均会被释放。

通过这种方式，Logix 在保持 Effect-Native 运行时特性的同时，为平台与 React/Form 层提供了一个稳定的 **App 级组合契约**：
微观层使用 `Logix.Module` / Bound API `$` 组织行为，宏观层推荐使用 `LogixRuntime.make(rootImpl, { layer, onError })` 组织 Root Module 与跨模块协作；AppRuntime 仅作为底层实现存在。

### 6.4 已知局限与取舍 (Known Trade-offs)

当前的 AppRuntime 设计在平台可解析性与工程灵活性之间做了一些有意识的取舍：

- **进程语义**：
  - `processes` 专门用于描述“长生命周期的守护进程 / 协调逻辑”，例如 `SearchDetailCoordinator`；
  - 一次性初始化脚本（如简单的日志打印、一次性的配置读取）建议放在 Infra 构建层或具体 Store/Logic 中，而非 `processes`。
- **Bundle 体积**：
  - 由于 AppRuntime 蓝图是静态结构，`modules` 中引用的所有 Store 实现会被打入主 Bundle；
  - 对于非常大的前端应用，这会增加首屏体积，但换来的是平台在“静态模式”下即可完整分析应用拓扑。
- **Layer 黑盒**：
  - `layer` 字段仍然是一个任意的 `Layer.Layer<R, any, never>`，平台不会尝试解析其中的服务细节；
  - 这样可以保留 Effect-Native 的完全表达力，同时将拓扑解析的范围聚焦在 `modules` / `processes` 这两类结构化资产上。
