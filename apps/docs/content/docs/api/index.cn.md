---
title: API 参考
description: Logix 核心 API 参考手册。
---

本部分包含 Logix 运行时核心 API 的详细说明。

如果你需要“签名与导出严格对齐”的完整字典，请直接使用 **自动生成的 API Reference**：

- [/api-reference](/api-reference)

## 目录

- [**Runtime 与 ManagedRuntime**](/cn/docs/api/core/runtime): 如何构造应用级 Runtime，并在不同宿主环境中运行 Logix。
- [**Bound API ($)**](/cn/docs/api/core/bound-api): 逻辑代码中最常用的 `$` 对象，提供访问状态、派发动作、监听事件和生命周期管理的能力。
- [**Module 定义与实现**](/cn/docs/api/core/module): 如何定义 Module 的 Shape（Schema）、创建 Module 实例以及组装 ModuleImpl。
- [**Flow API**](/cn/docs/api/core/flow): Fluent Flow 的底层 API 说明，与 `$.onAction / $.onState / $.on` 保持一一对应。
- [**React 集成**](/cn/docs/api/react/provider): 在 React 应用中通过 `RuntimeProvider` / `useModule` / `useSelector` / `useDispatch` 使用 Logix。

## 类型约定

在阅读 API 文档时，你会经常看到以下泛型：

- `Sh` (Shape): 表示 Module 的形状，包含 State Schema 和 Action Schema。
- `R` (Requirements): 表示逻辑运行所需的依赖环境（Services）。
- `E` (Error): 表示可能抛出的错误类型。
