---
title: Runtime Logix Core · Gaps & Production Readiness Checklist
status: draft
version: 0.1.0
layer: L9
related:
  - ../L5/runtime-core-evolution.md
  - ../topics/react-adapter
  - ../topics/query-integration
  - ./plan-runtime-logix-v1-readiness.md
priority: 1800
---

# Runtime Logix Core · Gaps & Production Readiness Checklist

> 草稿目的：汇总当前 Logix v3 Core（`@logix/core` + `@logix/react`）在「接近生产可用」前仍然需要补齐的关键缺口，为后续 PoC/集成测试与规范升级提供一个集中视图；配套路线图见 `plan-runtime-logix-v1-readiness.md`。

本草稿回答“**还有哪些坑没填**”，而 `plan-runtime-logix-v1-readiness.md` 回答“**按什么阶段填、做到什么程度算 v1.0 Ready**”。两者应保持同步演进。

## 0. 生产就绪评估维度（目标对齐）

结合 v1.0 规划，Runtime Logix 的生产就绪至少要在四个维度达标：

- **安全性 (Safety)**：避免“写错但不报错”的路径（Tag 冲突、Link 错误被悄悄吞掉）；
- **确定性 (Determinism)**：并发与生命周期边界清晰可预期（StrictMode、Scope 销毁、Link/Watcher 重启策略）；
- **可观测性 (Observability)**：跨模块链路可追踪、有统一的错误事件源（DebugSink / Lifecycle / AppRuntime errors）；
- **性能 (Performance)**：高频交互下无明显内存泄漏，Fiber/Scope/订阅数量在合理上界内。

## 1. 当前基础可用范围（v0 Candidate）

在小范围 PoC / 非关键路径场景下，可以尝试使用的能力（前提是有降级路径与观察手段）：

- `@logix/core`
  - Module / Runtime：
    - `Logix.Module` + `ModuleInstance.live`；
    - `ModuleRuntime.make` + DebugSink / Lifecycle 集成；
    - `ModuleImpl`：`Module.make({ initial, logics, imports?, processes? })` + `withLayer/withLayers`。
  - Bound API / Fluent DSL：
    - `$.state.read/update/mutate`；
    - `$.onState / $.onAction / $.on` + `run / runParallel / runLatest / runFork`；
    - `Logic.Link`：跨模块的命令式 Orchestrator。
  - Remote / App：
    - `$.useRemote(Module)`：只读版 Bound API，用于跨模块读取/订阅/dispatch；
    - 应用级 Runtime：Root ModuleImpl + `LogixRuntime.make(rootImpl, { layer, onError })`。

- `@logix/react`
  - `RuntimeProvider`：承载 ManagedRuntime 与 Context.Context 的适配层；
  - Hooks：
    - `useModule(handle)` / `useModule(handle, selector)`；
    - `useSelector(handle, selector)`；
    - `useLocalModule` / `useLayerModule`（在简单场景下尝试局部 ModuleImpl）。

## 2. 已知必须补齐的核心缺口

> 这些是「在生产级使用前必须有明确行为与测试兜底」的点，目前要么只有 PoC 实现，要么缺少规范与集成测试。

### 2.1 Tag 冲突与 Env 拓扑校验

- 现状：
  - `AppRuntime.makeApp` 已在合并 Layer 之前维护 `TagIndex`，对 **Module Tag + 显式声明的 Service Tag** 做冲突检测；
  - 具体实现见 `packages/logix-core/src/runtime/AppRuntime.ts` 中的 `buildTagIndex / validateTags` 与 `provideWithTags`，并通过 `AppRuntime.test.ts` 覆盖了“重复 ModuleId”与“多模块共享同一 ServiceTag key”两类场景；
  - 分形 Module 目前通过 `ModuleImpl.imports` / `withLayer` 组合 Env，`LogixRuntime.make(rootImpl, options)` 仅以 Root ModuleImpl 生成单一 `AppModuleEntry`，不会递归分析 imports 中的 Tag。
- 风险：
  - 对于只通过 Root ModuleImpl + imports 构建的分形 Runtime，**内部 Service Tag 冲突仍可能在 Layer 合并时静默覆盖**，`AppRuntime.makeApp` 无法观测到这些 Tag；
  - 对未来 Universe / Studio 的 Env 拓扑图而言，当前 TagIndex 只覆盖 App 级模块条目，尚不能完整反映分形 Module 树中的 Tag 拓扑。
- TODO（v1 必要 + v1 之后可选拆分）：
  - v1 范围（必要）：
    - 固化现有 `AppRuntime` 级别的 Tag 冲突检测规范（`TagCollisionError` 结构、报错信息格式），在 `runtime-logix/impl/app-runtime-and-modules.md` 与 `runtime-logix/core/05-runtime-implementation.md` 中作为正式约束沉淀；
    - 在更贴近真实使用的场景下补充集成测试：Root ModuleImpl + `LogixRuntime.make` 组合时，显式使用 `provideWithTags` 的 App 模块发生冲突应 fail，并暴露结构化错误。
  - v1 之后（值得做，但不阻挡 v1 Ready）：
    - 将 TagIndex 的构建前移到 **分形 ModuleDef / ModuleImpl 树** 级别，在 flatten imports / providers 时递归收集 Tag 信息（见 `runtime-logix/impl/app-runtime-and-modules.md` 中的 `ModuleDef` 草图，以及 L9 草案 `runtime-logix-fractal-tagindex-and-universe-tree.md`）；
    - 结合 Universe / Studio 的模块拓扑视图，定义 TagIndex 的导出结构与观测 API，让工具能够基于同一份 TagIndex 同时做“冲突检测 + Env 拓扑展示”；
    - 视后续复杂度再评估是否需要对通用 `Layer` 做深度 inspect，或仅在推荐路径（ModuleImpl.providers / exports）上进行 Tag 枚举与校验。

### 2.2 Link / useRemote 的错误与生命周期语义

- 现状：
  - `ModuleRuntime` 对 forked logics 的错误会通过 Lifecycle/DebugSink 汇聚，Link 使用时依赖这一层行为；
  - 应用级 Runtime 的 `onError`（在 `LogixRuntime.make` 的 options 中配置）会在 processes fail 时被调用；
  - 对于：
    - Link 内部抛错（fail/die）；
    - 通过 `$.useRemote(...)` 构造的跨模块 watcher 出现错误；
    当前规范没有明确约定：
    - 是否自动重启；
    - 错误是否应扩散到 App 级别，还是停留在模块/Link 范围。
- 风险：
  - 复杂链路中某个 Link 或 Remote watcher 挂掉后，可能悄悄停止工作而没有明显告警；
  - 若错误被误导致整个 AppRuntime 失败，生产可用性会受影响。
- TODO：
  - 在 `runtime-logix` 规范中明确：
    - Link 的错误语义（是否视为“流程级错误”，是否需要重试/重启策略）；
    - useRemote watcher 的错误归属（算当前模块的 Flow 错误，还是 Link 类错误）。
  - 在 `@logix/core` 中补充集成测试：
    - Link logic 中抛错 → 生命周期与 DebugSink 的表现；
    - RemoteBound (`$.useRemote`) 中抛错 → `api.lifecycle.onError` 与 App `onError` 是否能捕捉到。
  - 与 v1.0 Plan 对齐的默认策略：
    - Link / Remote watcher 出错时，**优先选择“报告但不中断调用方 Flow”**：错误进入 `api.lifecycle.onError` + App `onError`，由上层决定是否重启或降级，而不是直接 crash 整个 AppRuntime；
    - 对关键 Link 可选包装 `Effect.retry` 或 Supervisor，实现可配置的重试/熔断行为。

### 2.3 ReactPlatform 与 Platform Tag 的集成

- 现状：
  - `@logix/react/src/ReactPlatform.ts` 仅导出 Provider + hooks + `createRoot`；
  - `RuntimeProvider` 内部预留了 `platformBinding` 占位，但还没有向 `@logix/core` 的 `Platform` Tag 注入任何 React 侧能力（如 onSuspend/onResume/onReset）。
- 风险：
  - 在 React 应用里，`api.lifecycle.onSuspend/onResume/onReset` 等平台能力不会被触发；
  - 无法在“前端应用可见性/路由/Tab”等维度上对 watcher/Flow 进行节流或暂停。
- TODO：
  - 在 React 层设计最小的 `Platform` 实现：
    - onSuspend/onResume 与浏览器可见性/路由变更等事件的映射策略；
    - onReset 与用户登出/表单清空等 UI 操作的映射策略。
  - 在 `RuntimeProvider` 中：
    - 将 ReactPlatform 的 Platform 实例打入 `Layer`；
    - 用 hooks/bridge 把 React 生命周期事件转化为 Platform 调用。
  - 补充 React 层集成测试：
    - 模拟一个使用 `api.lifecycle.onSuspend` 的逻辑，在“伪造的可见性变化”下验证行为。

### 2.4 长生命周期 / 高并发 watcher 的内存与性能

- 现状：
  - `runFork / runParallel / Link / useRemote` 等能力会在背后 fork watcher Fiber；
  - 现有用例只验证了少量 dispatch 的语义正确性，没有验证持续高频事件或长时间运行下的行为。
- 风险：
  - 订阅泄漏：重复 mount/unmount 模块、重复注册 watcher 时，Scope 不当管理可能导致 Fiber 堆积；
  - 性能问题：高频事件流（搜索联想/滚动/心跳）下的 CPU/GC 压力未知。
- TODO：
  - 设计 1–2 组压力测试（可先放在内部 util/benchmarks，而非正式 test suite）：
    - 单模块 + 高频 `onAction(...).runFork`；
    - 多模块 + Link + useRemote 联动；
  - 观测指标：
    - Fiber 数量 / SubscriptionRef 数量的上界；
    - 长时间运行后的内存使用；
    - 在测试 Runtime 中故意触发大量 create/destroy，看 Scope 是否被 correctly close。
  - 更细化的场景设计与指标定义见 `runtime-logix-watcher-perf-and-leak-check.md`。

### 2.5 ModuleImpl / withLayer / useLocalModule 的组合边界

- 现状：
  - `Module.make({ initial, logics })` + `ModuleImpl.withLayer/withLayers` + `Logix.provide(ModuleImpl)` 在 core 层已经有成体系的实现与单测兜底：
    - `ModuleImpl.test.ts` 验证了 withLayer 注入 Service 后，Logic 中的 `yield* ServiceTag` 能正确拿到实现，状态也如预期更新；
    - `Logix.provide(ModuleImpl)` + `Logix.app` 组合后，同样行为在 AppRuntime 环境下保持一致；
  - React 层 `useLocalModule` / `useModule(impl)` 能创建局部 ModuleRuntime，并在组件卸载时关闭 Scope，但缺少“复杂 Env 组合 + 多层嵌套”的系统测试：
    - 多个 ModuleImpl 在组件树中的嵌套与共享；
    - useLocalModule 创建的局部 ModuleRuntime 与上层 AppRuntime 的 Env 叠加顺序；
    - 同一 ServiceTag 在 App 级与局部 ModuleImpl 级同时存在时的解析优先级。
- 风险：
  - 在复杂 UI 中大量使用局部 ModuleImpl 时，可能出现：
    - Env 提供顺序不一致（某些 Service 在局部被覆盖或意外泄漏到全局）；
    - Scope 泄漏或重复 dispose；
    - React 与 Logix.app 对同一 Service 的提供顺序不一致，导致行为在不同挂载方式下出现细微差异。
- TODO：
  - 在 core 层保持现有 ModuleImpl 测试为“回归必跑”集合，后续改动不得破坏；
  - 在 React 层补充至少一组集成用例：
    - `useLocalModule(impl)` + `useLayerModule` 在一个组件下创建/销毁多个 ModuleRuntime，检查 DebugSink/Scope 事件；
    - 组合 useLocalModule 与应用级 Runtime 提供的 Env，验证 Service 解析顺序与预期一致，必要时在文档中固定解析优先级；
    - 验证同一 ModuleImpl 在不同 RuntimeProvider 树下复用时，Service 注入仍然局部生效且不会互相污染。

### 2.6 React StrictMode / Suspense / 错误边界行为

- 现状：
  - `RuntimeProvider` 在实现上考虑了 StrictMode 下的 “双调用” 问题（通过 useRef 缓存 AppRuntime），但缺少系统测试；
  - Suspense / ErrorBoundary 与 Logix error 的交互尚未设计（目前 error 通过 lifecycle.onError/DebugSink 处理，未考虑 React error boundary）。
- 风险：
  - 在开启 StrictMode 的开发环境下，Runtime 创建/销毁次数可能与预期不一致；
  - 在生产中，当 Logic die 时，React UI 是否应该感知并展示错误不明确。
- TODO：
  - 明确策略：
    - StrictMode 下是否允许某些资源“多创建一次但不 dispose”，以及哪些必须严格成对；
    - Logic error 是否、以及如何 bubble 到 React ErrorBoundary。
  - 补充 React 层测试或 demo：
    - 在 StrictMode + Suspense 环境下 mount/unmount RuntimeProvider 和使用中的模块组件；
    - 测试 error boundary + lifecycle.onError 组合行为。
  - 结合 v1 Plan，考虑在 AppRuntime 层暴露一个只读的 `errors$` / Hub：
    - 汇聚 processes / Link / Logic 的错误事件；
    - React 侧 RuntimeProvider 可以基于该通道，将“全局不可恢复错误”映射到 ErrorBoundary（例如通过内部 `setState(error)` 触发 throw）。

### 2.7 统一观测通道（App 级事件 / 错误流）

- 现状：
  - ModuleRuntime 已通过 DebugSink 与 lifecycle.onError 暴露模块级事件；
  - AppRuntime 对 processes 提供了 `onError` 回调，但缺少一个统一的 App 级事件/错误通道；
  - React / CLI / 后台任务目前只能“各自订阅各自的错误”，不利于搭建统一的监控与告警。
- 风险：
  - 复杂场景下（多模块、多 Link、多 processes），问题定位需要同时查看 DebugSink / lifecycle.onError / App onError，多源信息不易聚合；
  - 后续要做“运行时仪表盘 / 监控插件”时，没有一个标准的入口可复用。
- TODO：
  - 在 AppRuntime 层设计一个只读的事件流（例如 `AppEvents` / `errors$`）：
    - 汇总关键事件：Module lifecycle.error、Link/useRemote watcher 错误、processes 错误等；
    - 明确事件模型与订阅方式（Effect.Stream / PubSub 等），便于上层绑定到日志/监控系统。
  - 在 React/CLI 层补充最小示例：
    - React：RuntimeProvider 内部订阅该通道，将“全局不可恢复错误”映射到 ErrorBoundary 或全局提示；
    - CLI/脚本：订阅事件流，将错误打印或上报到集中日志。

## 3. 建议的推进顺序（生产前最小补齐集）

1. Tag 冲突检测 + AppRuntime.onError 集成测试  
2. Link / useRemote 错误语义规范 + 简单集成测试（核心链路一条）  
3. ReactPlatform → Platform Tag 的最小集成（onSuspend/onResume/onReset）  
4. 压力测试（高频 watcher + 长生命周期）  
5. ModuleImpl / useLocalModule 边界场景实验  
6. React StrictMode/Suspense/ErrorBoundary 策略设计与 PoC

完成上述最小集后，可将当前 v0 能力标记为“有限生产可用（在已知模式和边界内使用）”，并在 `runtime-logix` 与相关 Topics 中更新规范；  
更细化的 Phase1/2/3 任务拆分（包含 Tag 检测实现策略、React ErrorBoundary 集成、压力测试脚本与覆盖率目标）见 `plan-runtime-logix-v1-readiness.md`。
