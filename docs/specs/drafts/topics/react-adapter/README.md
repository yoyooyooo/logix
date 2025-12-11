---
title: React Adapter Specification
status: draft
version: 2025-11-21
layer: Integration Layer
value: core
priority: next
related: []
---

# React Adapter Specification

> **Status**: Draft（部分内容已落地到 @logix/react 与 runtime-logix/react）
> **Date**: 2025-11-21
> **Layer**: Integration Layer

本文档定义 Logix 的通用 React 适配层。这一层的目标是提供一组底层的、高性能的 Hooks 和组件，用于将 Logix 的状态机无缝接入 React 组件树。它不包含任何特定业务领域（如表单）的逻辑，而是专注于 **State Synchronization** 和 **Event Dispatching**。

## 1. 核心定位 (Positioning)

如果 Logix 是 Redux，那么本层就是 `react-redux`。
如果 Logix 是 MobX，那么本层就是 `mobx-react`。

它的核心职责是：
1.  **Lifecycle Management**: 管理 Logix Store 在 React 组件生命周期内的创建与销毁 (Scope Handling)。
2.  **Subscription**: 利用 `useSyncExternalStore` 实现对 Logix State 的高效订阅。
3.  **Bridge**: 将 React 的交互事件 (Click, Change) 桥接到 Logix 的 Event Hub。

## 2. 设计原则 (Design Principles)

*   **Tearing Free**: 必须使用 `useSyncExternalStore` 保证并发渲染下的数据一致性。
*   **Selector First**: 默认鼓励使用 Selector 进行细粒度订阅，避免全量重渲染。
*   **Suspense Compatible**: 支持与 React Suspense 集成（未来规划）。
*   **UI-Intent Agnostic**: 不直接承载 UI Intent / 组件树结构，仅提供 Store / Event 级桥接能力，由上层 UI Intent / Studio 使用这些锚点做图码同步。

## 3. 模块索引

*   [01-hooks-api.md](./01-hooks-api.md): 核心 Hooks (`useModule`, `useSelector`)。
*   [02-context-injection.md](./02-context-injection.md): 依赖注入与 `RuntimeProvider`。

## 核心原则

1.  **Implicit Context**: 避免 Prop Drilling，通过 Context 隐式传递 Runtime。
2.  **Runtime Guard**: 运行时检查依赖完整性，提供友好报错。
3.  **Read/Write Segregation**:
    *   读：使用 `useModule` / `useSelector` 将 Module State 映射为视图数据；
    *   写：使用 `useDispatch` 获取 dispatch 函数触发 Action。

> 上层关系：UI Intent / Studio 主要通过两个维度消费 React Adapter：
> - 读：使用 `useModule` / `useSelector` 将 Store.State 映射为视图数据；
> - 写：通过绑定到 `$.actions.dispatch` / IntentRule Anchor 的事件处理函数，将 UI 事件投递给 Logix。
> React Adapter 自身保持不感知具体 UI Schema 或组件库，只暴露这些稳定锚点。
