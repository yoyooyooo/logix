---
title: React Adapter · Runtime Integration
status: draft
version: 2025-12-03
---

# React Adapter · `@logix/react` 规范总览

> 作用：作为 `@logix/react` 的规范性说明，串联 RuntimeProvider、核心 Hooks 与 React 18 并发模型之间的契约。
> 读者：使用 Logix 编写 React 前端的业务工程师、运行时实现者与平台集成方。

本节以当前 `@logix/react` 实现为事实源，约定 React 适配层的定位与 API 形态，并指向更详细的专题草案（见 `docs/specs/drafts/topics/react-adapter`）。

## 1. 定位与职责边界

- **定位**：`@logix/react` 是 Logix Runtime 的 React 适配层，对标 `react-redux` / `mobx-react`。
- **核心职责**：
  - 生命周期管理：在 React 组件树生命周期内创建、复用和销毁 Logix Runtime / ModuleRuntime；
  - 订阅模型：基于 `useSyncExternalStore` 提供撕裂安全的状态订阅；
  - 事件桥接：将 React 事件桥接到 Logix Action/Flow；
  - 依赖注入：通过 Context 在组件树顶部注入 Layer/Runtime。
- **非职责**：
  - 不承载业务领域逻辑（如表单/列表）；这些应由 `@logix/form`、场景包或业务代码实现；
  - 不定义 UI Intent / Skeleton 协议，这部分留给平台/Studio 与 UI 层规范。

## 2. RuntimeProvider 与 Runtime 注入

`RuntimeProvider` 是 React 适配层的入口组件，负责为子树提供一个带上下文的 `ManagedRuntime`：

- Props 约定：
  - `runtime?: ManagedRuntime<never, any>`：复用外部创建的 Runtime（推荐形态，通常来自 `Logix.Runtime.make(rootImpl, { layer, onError })`）；
  - `layer?: Layer<any, any, any>`：在父 Runtime 的基础上附加一层局部服务（页面/组件级 DI）。
- 运行模式：
  - 若提供 `runtime`，则直接复用该 Runtime（“一 Provider 一 Runtime”，适合作为 App/Page/Feature 的 Composition Root）；
  - 若未提供 `runtime`，则从上层 `RuntimeProvider` 继承 Runtime（嵌套 Provider 场景，形成分形 Runtime Tree）；
  - 若既没有 `runtime` prop，也不在任意 `RuntimeProvider` 内部使用，则会抛出错误，提示调用方在树顶显式提供 Runtime。
- Layer 绑定：
  - 对于传入的 `layer`，`RuntimeProvider` 会在内部创建一个 `Scope`，通过 `Layer.buildWithScope` 构建 Context，并在组件卸载时关闭 Scope；
  - 多个 Provider 可以叠加各自的 Layer，形成「全局 Runtime + 局部注入」的分层结构；
  - 当多个 Provider 使用 **同一 Runtime** 时（内层未显式传入 `runtime`），内层 Provider 的 `layer` 会优先提供 Env，并在同名 Tag 上覆盖外层 Provider 的值（即“内层覆盖外层”的 Env 规则）。

所有子组件均通过 React Context 访问一个「带 Context 适配的 Runtime」，该 Runtime 在每次 `run*` 时自动注入聚合 Context，保证 React 子树内的 Effect 调用都能获得正确的服务依赖。

## 3. 核心 Hooks 契约

### 3.1 `useModule`

`useModule` 是连接 React 与 Logix Module 的基础 Hook，负责在组件中获得 ModuleRuntime 或订阅其 State：

- 支持三类句柄：
  - `ModuleInstance`：`Logix.Module.make("Id", Shape)` 的实例 Tag；
- `ModuleImpl`：包含 `layer` + `module` 的实现体（通常由 `Module.implement({ initial, logics, imports?, processes? })` 及其 `withLayer/withLayers` 组合返回）；
  - `ModuleRuntime`：已存在的运行时实例。
- 调用形态：
  - `useModule(ModuleInstance | ModuleRuntime)`：返回稳定的 `ModuleRuntime` 引用；
  - `useModule(handle, selector, equalityFn?)`：在内部通过 `useSelector` 订阅状态。
- ModuleImpl 场景：
  - 对于 `ModuleImpl`，`useModule` 会通过 `useLocalModule` 在组件 Scope 内创建一棵局部 ModuleRuntime 树；
  - 该局部 Runtime 的资源由内部 Scope 托管，组件卸载时自动关闭。

### 3.2 `useSelector`

`useSelector` 提供撕裂安全的状态订阅能力：

- 基于 `useSyncExternalStoreWithSelector` 实现，签名为：
  - `useSelector(handle, selector, equalityFn?)`；
  - `handle` 可以是 ModuleRuntime 或 ModuleInstance Tag；
  - `selector` 以完整 State 为输入，返回任意派生值；
  - `equalityFn` 默认使用 `Object.is`，可自定义。
- 内部通过：
  - 使用 Runtime 的 `runFork(Stream.runForEach(moduleRuntime.changes(...)))` 注册订阅；
  - 使用 `runSync(moduleRuntime.getState)` 作为 `getSnapshot`。

### 3.3 `useDispatch`

`useDispatch` 负责从 React 环境中派发 Logix Action：

- 签名：`useDispatch(handle)`，其中 `handle` 为 ModuleInstance 或 ModuleRuntime；
- 内部行为：
  - 通过 `useRuntime` 获取当前适配后的 Runtime；
  - 通过 `useModuleRuntime(handle)` 获取目标 ModuleRuntime；
  - 返回的回调在调用时执行 `runtime.runFork(moduleRuntime.dispatch(action))`。

### 3.4 局部与列表场景

当前实现还提供以下 Hook，用于更复杂场景：

- `useLocalModule(factory, deps)`：在组件级 Scope 内创建 ModuleRuntime，适合表单/向导等局部状态；
- `useLayerModule`：在附加 Layer 的上下文中创建模块（实验性质）；
- `useModuleList`：订阅并管理一组模块实例列表（典型多行场景）。

这些 Hook 的具体行为在实现中已经固定，后续如需调整，应先更新本规范再修改代码。

## 4. React 18 并发与高级特性（规划）

当前 `@logix/react` 已经：

- 基于 `useSyncExternalStore` 保证基本的撕裂安全；
- 在 `useModule` / `useLocalModule` 中通过 `ModuleCache` (Resource Cache + Reference Counting) 管理资源，完美支持 StrictMode；
- **Suspense 集成**：通过 `useModule(Impl, { suspend: true, key })` 支持异步模块构建的挂起与回退；
- **runSync 不变量**：`ModuleCache.readSync` / `ManagedRuntime.runSync` 默认假定 Logic bootstrap 是同步可结束的；Runtime 通过 Phase Guard 将 setup 段的 run-only 调用收敛为结构化诊断（不抛出异步错误），保证 React 渲染阶段不会卡在未决 Fiber 上。
- **模块运行时配置（快照模型）**：RuntimeProvider 挂载时通过 `ManagedRuntime.runPromise` 计算一份配置快照并缓存，优先级为：
  - 调用点显式传入（`useModule(Impl, { gcTime/initTimeoutMs })`）；
  - Runtime Layer 覆盖：`ReactRuntimeConfig.replace({ gcTime, initTimeoutMs })`；
  - ConfigProvider：`logix.react.gc_time` / `logix.react.init_timeout_ms`；
  - 内部默认：gcTime=500ms（StrictMode 抖动保护），initTimeoutMs 未启用。
  - 快照带 `configVersion`，`useModule` / `ModuleCache` 只消费快照，不在 render 阶段 `runSync` 读 Env，兼容 StrictMode/Suspense 与含异步 Layer 的 Runtime。

其中，模块运行时配置的优先级与语义为：

- `gcTime`（无人持有后的保活时间，毫秒）：
  - 调用点：`useModule(Impl, { gcTime })` 显式传入时优先；
  - 其后为 Runtime Layer：`ReactRuntimeConfig.replace({ gcTime })`；
  - 再次回退 ConfigProvider：`Config.number("logix.react.gc_time")`；
  - 未配置时，内部默认值约为 `500ms`，主要用于抵御 StrictMode 下的 mount/unmount 抖动。
- `initTimeoutMs`（Suspense 模式下的整体初始化超时，毫秒）：
  - 仅在 `suspend: true` 场景生效；
  - 调用点：`useModule(Impl, { suspend: true, initTimeoutMs })` 显式传入时优先；
  - 其后为 Runtime Layer：`ReactRuntimeConfig.replace({ initTimeoutMs })`；
  - 再回退 ConfigProvider：`Config.option(Config.number("logix.react.init_timeout_ms"))`；
  - 未配置时视为“不开启初始化超时”，即保持默认无限等待。

> 这些 Config 键是 `@logix/react` 的内部实现细节，主要面向 Runtime/Adapter 作者与基础设施工程师；  
> 对普通业务开发者而言，只需记住：**默认情况下组件级 `useModule(Impl)` 会在卸载后短暂保活，Session 场景可以通过 `gcTime` 拉长保活时间，异步 ModuleImpl 则通过 `suspend: true + key (+ optional initTimeoutMs)` 显式声明行为。**

仍在规划中的能力包括：

- 更系统的 Concurrent 模式测试矩阵：验证多 RuntimeProvider / 多 Store 场景下的行为；
- SSR 与测试友好性：在无 DOM 环境下模拟 RuntimeProvider 行为，方便单元测试与服务端渲染。

上述高级能力中，Suspense 与 Resource Cache 已作为 L9 阶段成果落地，详见 `docs/specs/drafts/L9/react-use-local-module-runtime-overhaul.md`。

## 5. 示例与用户文档

- 运行时代码示例：
  - `examples/logix-react`：展示基于应用级 Runtime（`Logix.Runtime.make`）的 Counter 场景、Local Module 等典型集成方式。
- 用户向导文档：
  - apps/docs 中的「Logix + React 集成」指南（见 `apps/docs/content/docs/guide/...`），从业务工程师视角讲解如何使用 RuntimeProvider 与核心 Hooks。

后续在扩展 React Adapter 能力时，应遵循以下流程：

1. 在 `docs/specs/drafts/topics/react-adapter` 中以草案形式演化设计；
2. 待设计稳定后，先更新本规范文件和 `implementation-status.md`；
3. 最后在 `@logix/react` 中实现，并通过 `examples/logix-react` 与 apps/docs 教程验证 DX。
