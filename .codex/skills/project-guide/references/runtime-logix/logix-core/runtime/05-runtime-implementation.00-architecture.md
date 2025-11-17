# 1. 核心组件 (Core Components)

Logix 引擎本质上是一个 **Effect Layer Runtime**。

1.  **State Layer**: 提供 `Ref<State>` 服务。
2.  **Action Layer**: 提供 `Hub<Action>` 服务。
3.  **Logic 程序**: 消费 State 和 Action，运行 Long-running Fibers（即一组在 `Logic.Env` 上运行的长生命周期 Effect 程序）。

## 1.1 补充：Runtime Internals Contracts（020）

> 状态：已落地（见 `specs/020-runtime-internals-contracts/*`），用于把“内部协作协议/装配/试跑/反射”从隐式约定升级为可替换、可诊断的显式契约。

- **内部 hooks 收敛**：`runtime.__*` / `bound.__*` 的散落协议收敛为内部 Runtime Service `RuntimeInternals`（`packages/logix-core/src/internal/runtime/core/RuntimeInternals.ts`），仓库内统一通过 accessor 访问（`packages/logix-core/src/internal/runtime/core/runtimeInternalsAccessor.ts`）。
- **平台试跑（TrialRun）**：`Logix.Observability.trialRun` 提供 RunSession + EvidenceCollector 的一次性编排，导出可序列化 EvidencePackage；默认不依赖 DevtoolsHub 全局单例，且并行会话隔离（同进程可重复/并行试跑）。
- **构建态反射（Reflection）**：平台在标准 Build Env（ConfigProvider + RuntimeHost）中运行 Builder 一次导出 Static IR；违反构建态依赖约束时通过 ConstructionGuard 快速失败并给出可行动诊断（见 `packages/logix-core/src/internal/platform/*`）。

## 2. 组装流程 (Assembly Process)

当调用 `Logix.Module.make("Id", { state, actions }).live(initialState, ...logicPrograms)` 时，内部大致等价于：

1.  **Layer Composition**: 使用 `Layer.merge` 将 State Layer 和 Action Layer 合并为一个 `StoreLayer`，Logic 程序则在该 Runtime 上启动并托管生命周期（而不是作为 Layer 再次合并）。
2.  **Runtime Creation**: 使用 `Layer.toRuntime` 创建一个基于领域模块运行时实例的 Effect Runtime。
3.  **Scope Management**: 创建一个根 Scope，用于管理该 Module 对应 Store 的生命周期。

## 3. 逻辑的执行环境 (Logic Execution Environment)

在当前主线中，不存在一个独立的 `LogicDSLTag`。`Logic` 本身就是一个 `Effect` 程序，它运行在一个由模块运行时和外部注入服务（`R`）共同构成的 `Logic.Env` 环境中。

当 `Store` 运行时，它会构建这个 `Env`，并提供给所有基于 Bound API `$` 定义的 Logic 程序（例如 `Domain.logic(($)=>Effect.gen(...))`）。`Logic.Api`（即 `state`, `flow`, `control` 等）正是对这个 `Env` 中能力的封装，它在 `Store` 内部实现，并传递给业务逻辑，从而连接了抽象逻辑与真实的运行时。

## 3.1 Logic Bootstrap：三层模型与两阶段执行

> 结论状态（已取代同主题 drafts）：Runtime 以「蓝图 → 实例 → 完全铺好 Env」三层模型运行 Logic，内部统一使用 LogicPlan（setup/run）消除初始化噪音，并通过诊断约束错误阶段的调用。

- **三层模型**
  1. **Module 蓝图层**：`Logix.Module.make(...)`（ModuleDef）只定义 Schema/静态 reducer，不触发任何 Effect，也不得访问 Env。
  2. **Module 实例启动层 (t=0)**：`ModuleRuntime.make` 创建 stateRef/actionHub/lifecycle，执行每个 Logic 的 **setup 段**（注册 reducer、lifecycle、Debug/Devtools hook）；setup 不允许访问 Env/Service，不做 IO，必须幂等（StrictMode 重跑时通过诊断提示重复注册）。
  3. **完全铺好 Env 的 Runtime 层**：AppRuntime/RuntimeProvider 构建完成 `envLayer` 后，统一 `forkScoped(plan.run)` 启动 Logic 的 **run 段** 与 processes；此后若再出现 `Service not found` 视为真实配置错误。
- **LogicPlan 内部模型（对外仍是 `ModuleDef.logic(($)=>Effect)`）**
  - builder 闭包的一次性执行产出 `{ setup, run }`：return 前的同步注册被收集为 setup，return 的 Effect 作为 run。
  - 纯旧写法 `ModuleDef.logic(($)=>Effect.gen(...))` 等价于 `setup = Effect.void`、`run = 原逻辑`，完全兼容旧代码。
  - BoundApi 在 setup 阶段仅暴露注册类 API；run 阶段暴露完整 `$`。
- **运行时责任与错误收敛**
  - Logic 解析顺序：`isLogicPlan(raw)` → `returnsLogicPlan(raw)`（运行一次以解析 plan）→ 默认视为单阶段 Logic。解析失败或 Phase Guard 命中时统一归一为 `LogicFailure = LogicPhaseError | EnvServiceError | LogicUnknownError`，并通过 `DebugSink` 记录诊断。
- 为保证 `ModuleDef.live` / `Runtime.make` 的同步构造路径不被打断，Phase Guard 命中的逻辑会被降级为仅执行 setup 的 noop plan（带 `__skipRun` 标记），run 段不再 fork，避免抛出 `AsyncFiberException`。
  - Env 铺满后仍出现的 `Service not found` 视为硬错误；初始化期的 Env 访问由 Phase Guard + 诊断处理，不会泄漏到底层 `runSync`。
  - `LogicPhaseError` / reducer 诊断 / lifecycle 缺失等均通过结构化诊断事件对外暴露，调用方无需解析字符串。
- **诊断与非法用法矩阵（DEV 默认开启）**
  - setup 阶段调用 `$.onAction/$.onState/$.use` 等 run-only 能力 → `diagnostic(error) code=logic::invalid_phase kind=...`。
  - builder 顶层直接执行 `Effect.run*` → `diagnostic(error) code=logic::setup_unsafe_effect`，提示将 IO 移入 run 段或 Process。
  - 重复注册 reducer/lifecycle → 诊断折叠提示（避免 StrictMode 噪音），仍保持「每个 tag 至多一个 primary reducer」的不变式。
  - Env 缺失：仅在 Env Ready 之后出现时视为硬错误；初始化期的缺失不再被视为噪音，因为 setup 阶段不会访问 Env，run 阶段确保 Env 已就绪。

## 4. 并发与流 (Concurrency & Streams)

在当前主线中，Flow 本质上是 **Effect Stream**。

- `Flow.from(trigger)` 创建一个 Stream；
- `Flow.run(effect)` 使用 `Stream.runForEach` 消费这个 Stream（单 watcher 内串行执行）；
- `Flow.runParallel(effect)` 使用 `Stream.mapEffect(..., { concurrency: "unbounded" })` + `Stream.runDrain` 实现显式无界并发；
- 其它并发控制（Latest/Exhaust/Sequence）通过 `Stream.flatMap`、内部 Ref 等方式在单 watcher 内约束并发行为。

## 5. 资源清理 (Resource Disposal)

当 Store 被销毁时，根 Scope 被关闭。Effect Runtime 自动：

1.  取消所有 Logic Fiber。
2.  关闭 Action Hub。
3.  释放所有资源。

## 6. Runtime 容器实现 (Runtime / AppRuntime)

Runtime（通过 `Logix.Runtime.make` 构造）是分形 Runtime 下对外暴露的应用级运行时构建工厂；它以某个 **Root ModuleImpl** 为中心，将「图纸」（ModuleImpl.layer + processes）转换为「施工」（Layer + Runtime），提供统一的 **Composition Root**。  
AppRuntime（基于 `LogixAppConfig` / `AppDefinition`）则作为内部实现细节存在，主要服务于平台解析与运行时组合，不再建议业务代码直接调用。

## 6.1 配置与返回值 (Config & AppDefinition)

在实现层面，我们仍然通过一组结构化配置（`LogixAppConfig` / `AppDefinition`）来描述 AppRuntime 的内部形态，并在其之上封装对外的 `Logix.Runtime.make(root, options)`（`root` 可为 program module 或其 `.impl`）：

```ts
// App 配置：用于“画图纸”，不直接包含 Runtime 细节
export interface LogixAppConfig<R> {
  /**
   * 基础环境 Layer：
   * - Http / Router / Config / Logger / Platform 等全局服务；
   * - 要求第三个泛型为 never，表示已闭合依赖；
   * - 推荐在进入 AppRuntime.makeApp / `Logix.Runtime.make` 之前就收敛错误通道，使这里的 E=never。
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
   * - layer：该 Module 对应的 Runtime Layer，通常由 ModuleDef.live(initial, ...logics) 返回。
   *
   * 在实际实现中，AppRuntime.provide 会负责将 “Module + Runtime/Layer” 配对为 AppModuleEntry。
   */
  interface AppModuleEntry {
    readonly module: Logix.ModuleTagType<any, any>
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
>
> - `modules` 由 AppRuntime.provide(Module, ModuleDef.live(...)) 或等价 Layer 组合而成，在当前实现中对于 `Logix.Runtime.make` 来说通常只有一个入口模块（Root ModuleImpl 对应的 Module）；
> - `processes` 中的 Effect 代表“长生命周期逻辑”，例如跨 Store 协调的 Coordinator，或持续监听环境变化的后台任务；在分形 Runtime 模型下，它们通常来源于 Root ModuleImpl 的 `processes` 字段。

## 6.2 构建逻辑 (from Blueprint to Layer)

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
