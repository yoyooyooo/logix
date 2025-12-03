---
title: Logix 观测性重构：从 `secure` 到 Effect-Native Supervisor
status: superseded
version: 0.1.0
superseded_by: ../L5/runtime-core-evolution.md
priority: 600
---

# Logix 观测性重构 (Instrumentation Overhaul)

> **背景**：本草稿提出了一项“不计成本”的架构演进规划，旨在将 Logix 的运行时观测机制从当前临时的 `Logic.secure` 包装器，迁移到完全基于 Effect-Native 的 Supervisor 系统。

## 1. 背景与问题陈述

目前，`Logic.secure` 是我们用来“包裹”业务逻辑以实现横切关注点（日志、错误处理、元数据注入）的主要机制。虽然在 PoC 阶段它很实用，但存在显著的架构缺陷：

1.  **语义歧义**：`secure` 这个名字暗示了安全/鉴权，但实际上它做的是插桩/AOP（面向切面编程）。
2.  **手动且脆弱**：它依赖 DSL 层（`LogicBuilder`）显式调用 `secure`。如果开发者绕过 Builder，逻辑就会“裸奔”，失去可观测性。
3.  **非 Effect 原生**：它通过函数参数传递元数据（`LogicMeta`），忽略了 Effect 强大的原生能力，如 `FiberRef`、`Supervisor` 和 `Tracer`。
4.  **中间件僵化**：中间件注入与调用点耦合，难以进行全局配置或动态注入。

## 2. 愿景：“完美”的观测性

在一个成熟的、“不计成本”的架构中，观测性应该是 **隐形的、无处不在的，且在未启用时零开销的**。

### 核心原则

-   **零侵入 (Zero-Touch)**：业务逻辑（Flows）不应感知自己被监控。不再需要 `secure(...)` 包装器。
-   **Supervisor 驱动**：使用 `Effect.Supervisor` 自动捕获并监控所有 Logic 的执行生命周期。
-   **Trace 优先**：所有元数据（Logic Name, Store ID, Tags）应通过 `FiberRef` 传播，并与 `Effect.Tracer` 集成。
-   **结构化日志**：使用 `Effect.annotateLogs` 自动为每一行日志附加上下文。

## 3. 架构方案

### 3.1 阶段 1：语义对齐 (The "Instrument" API)

立即进行重构以修正语义，并引入基于 FiberRef 的元数据传递。

```typescript
// 之前
Logic.secure(effect, { name: "flow.run" })

// 之后
import { LogicContext } from "@logix/core/internal"

const instrument = (effect, meta) =>
  effect.pipe(
    // 1. 注入元数据到 FiberRef
    LogicContext.withMeta(meta),
    // 2. 原生 Tracing 集成
    Effect.withSpan(`Logix.${meta.name}`, { attributes: meta }),
    // 3. 日志注解
    Effect.annotateLogs({ logic_op: meta.name })
  )
```

### 3.2 阶段 2：引入 `LogixSupervisor`

终极目标是完全移除包装器。我们在 `ModuleRuntime` 层面引入一个自定义的 Supervisor。

> **注意**：Supervisor 仅负责“观测”（Logging/Tracing）。对于“干预”（如错误兜底），我们需要在 DSL 层保留显式的错误处理机制，或通过 `Effect.catchAllCause` 在底层统一拦截。

```typescript
// 定义 Supervisor Layer
const LogixSupervisorLive = Layer.succeed(
  Supervisor.Tag,
  new LogixSupervisor({
    onStart: (context, fiber) => telemetry.trackStart(context),
    onEnd: (value, fiber) => telemetry.trackEnd(value)
  })
)

// 在构建 Runtime 时注入
// ModuleRuntime 内部会使用该 Layer 来构建 ManagedRuntime
const runtimeLayer = Layer.mergeAll(
  LogixSupervisorLive,
  LogicContextLive,
  // ... 其他服务
)
```

### 3.3 阶段 3：隐式上下文传播与错误边界

不再通过函数参数层层传递 `LogicMeta`，而是使用 `FiberRef`。同时，必须解决 `FiberRef` 在 `fork` 时的传播问题，以及 Supervisor 无法拦截错误的局限。

```typescript
// 1. 上下文定义
export const CurrentLogicMeta = FiberRef.unsafeMake<LogicMeta | null>(null)

// 2. DSL 层的隐式注入 (LogicBuilder)
const runFlow = (flow, meta) =>
  flow.pipe(
    // 关键：在 fork 之前设置 Context，确保子 Fiber 继承
    Effect.locally(CurrentLogicMeta, meta),
    // 关键：显式错误边界，因为 Supervisor 无法吞掉错误
    Effect.catchAllCause(cause => handleLogicError(cause, meta)),
    Effect.fork
  )
```

## 4. 迁移路线图

### 步骤 1：重命名与职责分离 (v3.1)
-   重命名 `Logic.secure` -> `Logic.instrument`。
-   **剥离错误处理**：明确 `instrument` 只负责观测。如果原 `secure` 包含错误处理逻辑，需拆分为独立的 `Logic.catch` 或移入 Flow 定义。

### 步骤 2：引入 FiberRef 上下文 (v3.2)
-   创建 `LogicContext` 服务/FiberRef。
-   验证 `runLatest` / `runExhaust` 等并发算子下的 Context 传播正确性（Snapshot 机制验证）。

### 步骤 3：Supervisor 实现 (v4.0)
-   实现 `LogixSupervisor` 并通过 Layer 注入。
-   移除 DSL 中的 `Logic.instrument`，改为自动注入 `LogicBoundaryTag` 和 `Effect.catchAllCause`。

## 5. 收益

-   **开发者体验**：不再需要担心“我记得调用 secure 了吗？”。
-   **可观测性**：与 Effect 生态系统（OpenTelemetry, Console 等）深度集成。
-   **代码整洁**：DSL 代码变回纯粹的逻辑构建，与运行时关注点分离。

## 6. 风险与缓解策略 (Risks & Mitigations)

### 6.1 性能风险：Supervisor 开销
*   **风险分析**：`Effect.Supervisor` 会拦截 Fiber 的生命周期。
*   **缓解策略**：
    *   **采样与过滤**：引入 `LogicBoundary` 标记，Supervisor 仅处理带有该标记的 Fiber。
    *   **异步处理**：`onEnd` 仅推入 Ring Buffer，后台异步处理。

### 6.2 调试体验风险：隐式黑盒
*   **风险分析**：观测逻辑“隐形”，调试难度增加。
*   **缓解策略**：
    *   **DevTools 配套**：**必须**在移除显式 API 前提供可视化工具。
    *   **调试模式**：提供 `Logix.debug(true)` 开关，输出 Context 传播日志。

### 6.3 平台与场景兼容性风险 (Multi-Instance & SSR)
*   **风险分析**：
    *   **多实例**：React 中可能存在多个 Module 实例。全局 Supervisor 可能导致 Trace 混淆。
    *   **SSR**：服务端渲染时 Supervisor 会被触发，需避免数据污染。
*   **缓解策略**：
    *   **实例级 Scope**：Supervisor 不应是全局单例，而应随 `ModuleRuntime` 实例化，每个 Runtime 拥有独立的 Supervisor 实例。
    *   **环境感知**：Supervisor 内部检测 `typeof window`，在 SSR 环境下仅记录日志不上传 Trace，或附加 `server: true` 标签。

### 6.4 边界界定与错误语义风险
*   **风险分析**：Supervisor 无法替代 Middleware 的“错误拦截”能力；且难以区分业务逻辑与内部函数。
*   **缓解策略**：
    *   **LogicBoundary 标记**：DSL 层自动注入 `LogicBoundaryTag`。
    *   **显式错误边界**：在 DSL 生成代码时，自动在最外层包裹 `Effect.catchAllCause`，确保错误被捕获并上报，而不是依赖 Supervisor 及其副作用。

### 6.5 迁移成本风险
*   **风险分析**：思维模式剧变，生态分裂。
*   **缓解策略**：
    *   **双模共存**：v3.x 同时支持显式/隐式模式。
    *   **Codemod 工具**：自动化替换脚本。
