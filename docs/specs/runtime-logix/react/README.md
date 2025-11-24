# React Adapter Specification

> **Status**: Draft
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

## 3. 模块索引

*   [01-hooks-api.md](./01-hooks-api.md): 核心 Hooks (`useStore`, `useSelector`)。
*   [02-context-injection.md](./02-context-injection.md): 基于 Context 的依赖注入模式。
*   [03-concurrent-rendering.md](./03-concurrent-rendering.md): 并发特性支持。
