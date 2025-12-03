---
title: "Logix 思维 (Thinking in Logix)"
description: 理解 Logix 的核心心智模型：Intent, Flow, and Effect.
---



如果你熟悉 React，你可能听说过 "Thinking in React" —— 将 UI 视为状态的函数。
Logix 将这一思想延伸到了业务逻辑领域：**将业务逻辑视为意图（Intent）的流（Flow）。**

## 1. 意图驱动 (Intent-Driven)

在传统开发中，我们习惯于“调用函数”。
在 Logix 中，我们提倡“表达意图”。

-   **传统**: `handleClick` -> `fetchUser()` -> `setState()`
-   **Logix**: `dispatch(LoadUser)` -> **System handles the rest**

UI 组件不应该知道“如何”加载用户，它只应该知道“用户想要加载用户”。

## 2. 响应式流 (Reactive Flow)

业务逻辑往往不是线性的，而是充满了异步、竞态和联动。
Logix 使用 **Flow** 来描述这些关系。

想象一下，你的业务逻辑是一组管道：

-   **Input**: Action 流 (点击、输入) 或 State 流 (数据变化)。
-   **Transform**: 过滤、防抖、映射。
-   **Effect**: 执行副作用 (API 调用) 并更新状态。

```typescript
// "当用户名变化时，防抖 500ms，然后检查重名"
$.onState(s => s.username)
  .debounce(500)
  .runLatest(checkUsername)
```

这种声明式的写法，比散落在 `useEffect` 或回调函数中的命令式代码更易读、更易维护。

## 3. 模块化 (Modular)

Logix 的世界由 **Module** 组成。每个 Module 是一个独立的微应用，包含自己的：

-   **State**: 数据结构。
-   **Actions**: 交互契约。
-   **Logic**: 业务规则。

Module 可以组合，也可以独立测试。

## 4. Effect-Native

Logix 构建在 **Effect** 之上。这意味着你可以直接使用 Effect 强大的生态系统：

-   **错误处理**: 强类型的错误通道，不再有未捕获的 Promise reject。
-   **并发控制**: 轻松处理竞态、重试、超时。
-   **依赖注入**: 优雅地管理服务依赖。

## 总结

Thinking in Logix 意味着：

1.  **定义意图** (Schema)，而不是编写过程。
2.  **描述流向** (Flow)，而不是手动调度。
3.  **隔离副作用** (Effect)，让核心逻辑保持纯粹。
