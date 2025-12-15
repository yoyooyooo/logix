# Module Assets (Intent Layer)

> **Status**: Draft (v3 Proposal)
> **Date**: 2025-11-28
> **Scope**: Intent-Driven AI Coding / Asset Definition

## 1. 核心概念：Module as Asset

在 Logix v3 的 Intent 架构中，**Module** 是描述业务领域边界和能力的**资产对象（Asset Object）**。

它位于 **Intent Layer**，负责定义“是什么”（Schema/Actions），而运行时层负责“怎么跑”（Execution/State Management）。

### 1.1 职责分离

| 概念 | 层级 | 职责 | 产物 |
| :--- | :--- | :--- | :--- |
| **Module** | Intent (L1) | 定义数据形状、交互契约、逻辑规格 | `Module` 对象 (SSOT) |
| **Runtime** | Runtime (L0) | 提供状态容器、分发动作、管理副作用 | 运行时容器实例 |

## 2. 代码层映射：Module ↔ Logix.Module

在当前 v3 规划中，我们**不再单独引入 `Module.define` 作为代码 API**，而是约定：

- 在代码层，**一个领域资产由 `Logix.Module` 表示**；
- 在概念层，我们仍然称之为“某个领域的 Module 资产”。

也就是说：

```ts
import { Schema } from 'effect';
import * as Logix from '@logix/core';

// 领域资产（Module Asset）：计数器
export const Counter = Logix.Module.make('Counter', {
  state: Schema.Struct({
    count: Schema.Number,
  }),
  actions: Schema.Union(
    Schema.Struct({ _tag: Schema.Literal('inc') }),
    Schema.Struct({ _tag: Schema.Literal('dec') }),
  ),
});
```

这里的 `Counter` 同时扮演：

- 领域资产（Module）：从 Intent 视角，这是描述 Counter 领域的“契约对象”；
- Module 定义：从 Runtime 视角，它提供 State/Action 形状与 Logic 入口；
- Tag：从 Env/DI 视角，它可以被 `$.use(Counter)` 引用，用于跨模块协作。

## 3. 与 Logic 的关系：`Module.logic(($) => ...)`

Logic 不直接依赖某个“Module API 函数家族”，而是通过 `Module.logic(($)=>Effect)` 在领域资产上挂载逻辑：

```ts
// Counter.logic.ts
import { Effect } from 'effect';
import { Counter } from './counter.module';

export const CounterLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    // Action → State
    yield* $.onAction((a): a is { _tag: 'inc' } => a._tag === 'inc').update(
      (prev) => ({ ...prev, count: prev.count + 1 }),
    );

    // State → State
    yield* $.onState((s) => s.count).run(() => Effect.logInfo('Count changed'));
  }),
);
```

在这个模型下：

- 领域资产（Counter Module）在代码中对应于 `Counter`（一个 `Logix.Module` 值）；
- Logic 通过 `Module.logic(($)=>...)` 注入 Bound API（`$`）并与该领域紧密绑定；
- 平台可以直接将 `Counter` 视为 Module 资产，用于构建 Universe View 和 IntentRule 图。

## 4. 运行时投影：`Module.live`

在运行时，领域资产最终会被投影为运行时容器实例。v3.1 之后，这一步通过 `Module.live` 完成：

```ts
// Counter.module.ts
export const Counter = Logix.Module.make('Counter', {
  state: CounterStateSchema,
  actions: CounterActionSchema,
});

// Counter.logic.ts
export const CounterLogic = Counter.logic(/* ... */);

// Counter.live.ts
export const CounterLive = Counter.live(
  { count: 0 },
  CounterLogic,
);
```

> **总结**
> - 概念层：Module 是 Intent/Asset 视角下的领域模块；
> - 代码层：Module 由 `Logix.Module.make('Id', { state, actions })` 表示；
> - 运行时层：Module 通过 `Module.live(initial, ...logics)` 投影为可注入的运行时 Layer。
>
> 我们刻意避免引入额外的 `Module.define` API，以保证架构只有一套定义入口，减轻后续维护与演进成本。
