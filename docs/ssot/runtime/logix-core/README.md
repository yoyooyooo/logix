# Logix Core

> **The Intent-Driven State Engine**

Logix Core 是 Logix 平台的运行时心脏。它是一个基于 **Effect-TS** 构建的、高性能、可组合、全双工的状态管理引擎。

## 核心特性

- **Effect-Native**: 全面拥抱 State/Action Layer 和 Stream，提供极致的组合能力。
- **Intent-Driven**: 严格区分 Data (State) 与 Intent (Action)。
- **Full-Duplex**: 支持代码与可视化图的无损同步。
- **Modular**: 支持逻辑拆分与 Pattern 复用。

## 快速开始（Module-First）

```ts
import * as Logix from '@logixjs/core';
import { Schema, Effect } from 'effect';

// 1. 定义领域 Module（返回 ModuleDef：纯定义，不含实例）
export const CounterDef = Logix.Module.make('Counter', {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    inc: Schema.Void,
  },
});

// 2. 在该 ModuleDef 上编写 Logic 程序（使用 Bound API `$`）
export const CounterLogic = CounterDef.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc')
      .mutate((draft) => {
        draft.count += 1;
      });
  }),
);

// 3. 生成 Live Layer（初始 State + 一组 Logic 程序）
export const CounterLive = CounterDef.live(
  { count: 0 },
  CounterLogic,
);

// 4. 使用：在 Runtime/React Shell 中注入 CounterLive
```

## 文档索引

### 业务开发（最短路径）

- [`api/02-module-and-logic-api.md`](api/02-module-and-logic-api.md)：Module / Logic / Live / `$`
- [`api/03-logic-and-flow.md`](api/03-logic-and-flow.md)：Fluent DSL / Flow / 结构化控制流（Effect.\* + `$.match`）
- 示例：[`examples/README.md`](examples/README.md)

> 注：上述 API 文档为“LLM 薄入口”，正文已分拆为同目录的分节文件（例如 `02-module-and-logic-api.01-*.md`、`03-logic-and-flow.03-*.md`）；按需加载可显著节约 token。

### 引擎实现（按需深读）

- [`runtime/05-runtime-implementation.md`](runtime/05-runtime-implementation.md)：Runtime 内核实现与事务/Scope 不变量
- [`api/06-reflection-and-trial-run.md`](api/06-reflection-and-trial-run.md)：Reflection / Trial Run（IR/证据提取）
- [`api/07-ir-pipeline-from-irpage.md`](api/07-ir-pipeline-from-irpage.md)：从 `IrPage` 反推 IR 全链路（字段语义 + sandbox 传输）
- [`observability/09-debugging.md`](observability/09-debugging.md)：DebugSink / Devtools 契约与事件口径
- [`runtime/11-error-handling.md`](runtime/11-error-handling.md)：错误分层与兜底策略
- `impl/`：实现备忘录（更细、更工程化，非业务必读）

### 平台/适配层

- [`platform/06-platform-integration.md`](platform/06-platform-integration.md)：平台集成与 IntentRule
- React：[`../logix-react/01-react-integration.md`](../logix-react/01-react-integration.md)
- Form：`../logix-form/README.md`

### 设计与模式（可选）

- [`concepts/00-manifesto.md`](concepts/00-manifesto.md)、[`concepts/01-architecture.md`](concepts/01-architecture.md)、[`concepts/02-long-chain-tour.md`](concepts/02-long-chain-tour.md)、[`concepts/03-intent-alignment.md`](concepts/03-intent-alignment.md)
- Patterns：[`patterns/04-pattern.md`](patterns/04-pattern.md)、[`patterns/10-pattern-multi-instance.md`](patterns/10-pattern-multi-instance.md)
- Guides：[`guides/08-usage-guidelines.md`](guides/08-usage-guidelines.md)、[`guides/integration-guide.md`](guides/integration-guide.md)
- Middleware：[`api/04-logic-middleware.md`](api/04-logic-middleware.md)
