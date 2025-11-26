# 实现架构 (Implementation Architecture)

> **Status**: Definitive (v3 Effect-Native)
> **Date**: 2025-11-24
> **Layer**: Core Engine Implementation

本文档详细描述了 Logix 核心引擎的内部实现架构。它解释了 `Store.make` 如何将 `State`、`Action` 的 Layer 与一组 Logic 程序组装成一个可运行的状态机。所有 API 和类型定义以 `docs/specs/intent-driven-ai-coding/v3/effect-poc` 中的 PoC 为最新事实源。

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
