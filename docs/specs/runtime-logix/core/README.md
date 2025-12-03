# Logix Core

> **The Intent-Driven State Engine**

Logix Core 是 Logix 平台的运行时心脏。它是一个基于 **Effect-TS** 构建的、高性能、可组合、全双工的状态管理引擎。

## 核心特性

*   **Effect-Native**: 全面拥抱 State/Action Layer 和 Stream，提供极致的组合能力。
*   **Intent-Driven**: 严格区分 Data (State) 与 Intent (Action)。
*   **Full-Duplex**: 支持代码与可视化图的无损同步。
*   **Modular**: 支持逻辑拆分与 Pattern 复用。

## 快速开始（Module-First）

```ts
import { Logix } from '@logix/core';
import { Schema, Effect } from 'effect';

// 1. 定义领域 Module（纯定义，不含实例）
export const CounterModule = Logix.Module('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
});

// 2. 在该 Module 上编写 Logic 程序（使用 Bound API `$`）
export const CounterLogic = CounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc')
      .mutate((draft) => {
        draft.count += 1;
      });
  }),
);

// 3. 生成 Live Layer（初始 State + 一组 Logic 程序）
export const CounterLive = CounterModule.live(
  { count: 0 },
  CounterLogic,
);

// 4. 使用：在 Runtime/React Shell 中注入 CounterLive
```

## 文档索引

*   [架构总览](01-architecture.md)
*   [Module / Logic / Live / `$` 总览](02-module-and-logic-api.md)
*   [Logic & Flow (工具)](03-logic-and-flow.md)：Logic / Flow / Control / Bound API `$` 详解
*   [Logic Middleware](./04-logic-middleware.md)：Logic Middleware 与 `Logic.secure` 安全机制
*   [Pattern (资产)](04-pattern.md)
*   [实现架构](05-runtime-implementation.md)：Runtime 内部实现架构（ModuleRuntime / Store / Scope / Layer）
*   [平台集成](06-platform-integration.md)
*   [React 集成](07-react-integration.md)
*   [使用指南](08-usage-guidelines.md)
*   [调试功能](09-debugging.md)
