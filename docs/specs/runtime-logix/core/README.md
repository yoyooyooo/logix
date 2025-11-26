# Logix Core

> **The Intent-Driven State Engine**

Logix Core 是 Logix 平台的运行时心脏。它是一个基于 **Effect-TS** 构建的、高性能、可组合、全双工的状态管理引擎。

## 核心特性

*   **Effect-Native**: 全面拥抱 State/Action Layer 和 Stream，提供极致的组合能力。
*   **Intent-Driven**: 严格区分 Data (State) 与 Intent (Action)。
*   **Full-Duplex**: 支持代码与可视化图的无损同步。
*   **Modular**: 支持逻辑拆分与 Pattern 复用。

## 快速开始

```typescript
import { Store, Flow, Logic } from '@logix/core';
import { Schema, Effect } from 'effect';

// 1. 定义 State Layer
const StateLive = Store.State.make(
  Schema.Struct({ count: Schema.Number }), 
  { count: 0 }
);

// 2. 定义 Action Layer
const ActionLive = Store.Actions.make(
  Schema.Union(Schema.Struct({ _tag: 'inc' }))
);

// 3. 定义 Logic 程序
const CounterLogic = Logic.make<CounterShape>(({ flow, state }) => 
  Effect.gen(function*(_) {
    const inc$ = flow.fromAction(a => a._tag === 'inc');
    yield* inc$.pipe(
      flow.run(state.mutate(draft => { draft.count += 1; }))
    );
  })
);

// 4. 组装 Store (State/Action Layer + Logic 程序)
const store = Store.make(
  StateLive,
  ActionLive,
  CounterLogic
);

// 5. 使用
store.dispatch({ _tag: 'inc' });
```

## 文档索引

*   [架构总览](01-architecture.md)
*   [Store (容器)](02-store.md)
*   [Logic & Flow (工具)](03-logic-and-flow.md)
*   [Pattern (资产)](04-pattern.md)
*   [实现架构](05-runtime-implementation.md)
*   [平台集成](06-platform-integration.md)
*   [React 集成](07-react-integration.md)
*   [使用指南](08-usage-guidelines.md)
*   [调试功能](09-debugging.md)
