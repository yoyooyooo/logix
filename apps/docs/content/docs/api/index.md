---
title: API 参考
description: Logix 核心 API 参考手册。
---



本部分包含 Logix 运行时核心 API 的详细说明。

## 目录

-   [**Runtime 与 RuntimeProvider**](./runtime): 如何构造应用级 Runtime，并在 React 中通过 `RuntimeProvider` 提供和扩展 Runtime。
-   [**Bound API ($)**](./bound-api): 逻辑代码中最常用的 `$` 对象，提供了访问状态、派发动作、监听事件和生命周期管理的能力。
-   [**Module 定义**](./module-definition): 如何定义 Module 的 Shape（Schema）、创建 Module 实例以及组织代码结构。
-   [**Logic Flow**](./logic-flow): 基于 Fluent API 的事件驱动逻辑编写指南，涵盖 `onAction`、`onState` 以及流式操作符。
-   [**Lifecycle**](./lifecycle): 深入理解 Module 的生命周期钩子（Init, Destroy, Error）以及与 Effect Scope 的关系。

## 类型约定

在阅读 API 文档时，你会经常看到以下泛型：

-   `Sh` (Shape): 表示 Module 的形状，包含 State Schema 和 Action Schema。
-   `R` (Requirements): 表示逻辑运行所需的依赖环境（Services）。
-   `E` (Error): 表示可能抛出的错误类型。
