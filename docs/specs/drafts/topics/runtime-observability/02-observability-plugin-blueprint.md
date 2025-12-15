---
title: Observability & Track Capability Blueprint
status: draft
version: 0.1.0
value: core
priority: next
related:
  - ../../../../specs/007-unify-trait-system/contracts/replay-and-diagnostics.md
  - ../../../runtime-logix/core/09-debugging.md
  - ../devtools-and-studio/01-cli-and-dev-server.md
  - ../devtools-and-studio/02-full-duplex-digital-twin.md
---

# Observability & Track Capability Blueprint

> 核心观点：  
> - **观测内核（Tracer / TraceBus / DebugSink）必须内置在 `@logix/core`，不可选**；  
> - **Track/Debug 作为能力插件，只负责“订阅/转码/输出”，而不是负责打点本身**。

## 1. 分层：内核观测 vs 能力插件

### 1.1 内核观测（Runtime-Grade · Core）

- 集成 Effect 自带的 `Tracer`，在 `ModuleRuntime` / Flow / Capability 边界打点：  
  - watcher 触发（source）；  
  - Effect 运行开始/结束、错误、取消；  
  - 能力调用入口/出口（如 `$.query` / `$.router`）。
- 将这些事件统一映射为 `runtime-logix/core/09-debugging.md` 中定义的 **DebugEvent** 形状，并通过 `DebugSinkTag` 广播；  
- 在实现层可以将 DebugSink 视为“TraceBus”的当前具体形态：  
  - DebugSink 是对外暴露的事件接口；  
  - 内部仍可用更细粒度的 Tracer/TraceService 组合实现事件收集与处理。  
- DebugSink / TraceBus 是 Runtime 的一部分：即使没有任何插件，基础 Debug 事件也应存在，供 DevTools / Studio / Test 使用。

### 1.2 Observability / Track 能力插件（Platform-Grade）

在“平台侧可选能力”的视角下，Observability 插件的职责是：

- 从 TraceBus 订阅事件流；  
- 将事件转码并输出到：
  - 业务埋点系统（`$.track.view / $.track.event`）；  
  - DevTools / Studio（时间线、线路发光、调试控制台）；  
  - 日志/告警系统（结构化日志、错误告警）。
- 为 Logic/Flow 提供 `$track` / `$debug` 等 API，作为高层“语义事件”的入口：  
  - 这些 API 本质上也是往 TraceBus 追加事件，只是语义更贴近业务或调试需求。

> 边界约束：  
> - 插件不得“偷偷拦截/重写”核心打点逻辑；  
> - 是否启用插件只影响“事件被送往哪里、如何呈现”，而不影响“是否产生基础 Trace 事件”。

## 2. 在 CapabilityPlugin 蓝图中的位置

基于 `CapabilityPlugin` 抽象，Observability 插件可以被视为一个特殊能力插件：

- `config`：采样策略、敏感字段脱敏规则、埋点通道、日志后端等；  
- `layer(config)`：提供 `TrackService` / `DebugService` 等，并绑定到 TraceBus；  
- `bind(ctx)`：将 `TrackService` / `DebugService` 映射为 `$track` / `$debug` API。

与其他能力插件（Query/Router/Form/AI）不同的是：

- Observability 插件不负责“产生业务数据”，而是负责“解释与转运”基础观测信号；  
- 即便完全不使用 `$track` / `$debug`，核心 Trace 仍然存在。

## 3. 与 DevTools & Studio 的契约（概要）

本草案只做高层对齐，细节将在 `03-devtools-integration-contract.md` 中展开。

- Runtime 向 Dev Server 暴露统一 Debug 事件流接口：  
  - 事件源自 TraceBus，包含 Effect/Flow/Capability 的执行信息；  
  - Observability 插件可以在事件中附加更高层语义（业务 Track、调试标记）。
- Dev Server 作为 Trace Hub，将这些事件转发给 Studio：  
  - Galaxy 图上的线路发光；  
  - Timeline / Console 视图；  
  - AI 辅助调试建议。

Observability 插件在这其中扮演“桥梁”角色：  
- 从 Runtime 核心观测中提炼出“平台能理解的事件”；  
- 同时为业务逻辑提供一套 `$track` / `$debug` API，统一业务埋点与调试标记的写法。
