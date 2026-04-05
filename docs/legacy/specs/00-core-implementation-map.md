---
title: 00 · 核心实现脉络图谱 (Core Implementation Map)
status: definitive
version: 1
---

> 本文档是 Intent-Flow 项目代码实现的 **导游图**。它将 `v3` 概念模型映射到 `packages/*` 中的具体源码位置，帮助开发者（和 LLM）快速定位核心逻辑。

## 1. 全景导航 (The Big Picture)

### 1.1 三层映射 (The 3-Layer Mapping)

| Layer       | Concept (SSoT)           | Implementation (Runtime)    | Source Entry (Codebase)                                |
| :---------- | :----------------------- | :-------------------------- | :----------------------------------------------------- |
| **Module**  | **Module** (Data/Schema) | `ModuleImpl` / `Store`      | [`Module.ts`](../../packages/logix-core/src/Module.ts) |
| **Logic**   | **Logic** (Behavior)     | `Logic` / `LogicMiddleware` | [`Logic.ts`](../../packages/logix-core/src/Logic.ts)   |
| **Runtime** | **Flow** (Execution)     | `EffectOp` / `FlowRuntime`  | [`Flow.ts`](../../packages/logix-core/src/Flow.ts)     |

### 1.2 关键目录 (Key Directories)

- **Spec SSoT**: `docs/ssot/platform` (意图模型事实源)
- **Runtime SSoT**: `docs/ssot/runtime` (运行时设计事实源)
- **Core Implementation**: `packages/logix-core/src` (核心代码)
- **Proof of Concepts**: `examples/logix` (场景验证)

## 2. 核心链路源码指引 (Core Source Paths)

### 2.1 模块定义与资产 (Module & Assets)

Module 是运行时的基本单元，承载 State、Actions 和 Logic。

- **Public API**: [`packages/logix-core/src/Module.ts`](../../packages/logix-core/src/Module.ts)
  - `Module.make`: 定义模块静态结构 (ID, State Schema, Action Schema)。
  - `Module.implement`: 组合 Logic 和 Layer 形成可运行的模块实现。
- **Internal Core**: `packages/logix-core/src/internal/runtime/core/ModuleRuntime.ts`
  - 负责 Module 的实例化、资源管理和生命周期。

### 2.2 逻辑编排 (Logic & Bound API)

Logic 是业务行为的集合，通过 `$` (BoundContext) 与 Runtime 交互。

- **Public API**: [`packages/logix-core/src/Logic.ts`](../../packages/logix-core/src/Logic.ts)
  - `Logic.make` / `Module.logic`: 定义逻辑块。
  - **Bound API (`$`)**: 定义了 `$.onState`, `$.actions`, `$.use` 等核心能力。
- **Middleware**: [`packages/logix-core/src/internal/runtime/core/LogicMiddleware.ts`](../../packages/logix-core/src/internal/runtime/core/LogicMiddleware.ts)
  - `IntentBuilder`: 实现 Fluent DSL (`$.on(...).run(...)`) 的构建过程。
  - `LogicMiddleware`: 负责将构建好的 Intent 转化为实际的 Runtime Ops。

### 2.3 流运行与副作用 (Flow & EffectOp)

Flow 是 Logic 意图在底层的执行引擎，基于 Effect-TS 和 EffectOp。

- **Public API**: [`packages/logix-core/src/Flow.ts`](../../packages/logix-core/src/Flow.ts)
  - 提供了 `Flow.fromAction`, `Flow.debounce` 等流式算子 (独立于 `$` 的纯 Flow API)。
- **Execution Engine**: [`packages/logix-core/src/internal/runtime/core/EffectOpCore.ts`](../../packages/logix-core/src/internal/runtime/core/EffectOpCore.ts)
  - **`EffectOp`**: 核心原语。所有的 Logic 操作（读写状态、监听事件、执行副作用）最终都编译为 `EffectOp` 指令。
  - **`Interpreter`**: 执行 `EffectOp` 指令集，对接底层 Effect Runtime。

### 2.4 平台集成 (Platform Integration)

- **React Connector**: [`packages/logix-react/src`](../../packages/logix-react/src)
  - `useModule`:由于 React 组件消费 Module。
- **Devtools**: [`packages/logix-devtools-react/src`](../../packages/logix-devtools-react/src)
  - 通过 `DebugSink` (在 Core 中) 收集运行时事件。

## 3. 典型调用链 (Typical Call Stack)

当在 Logic 中写下 `$.onAction('submit').run(handler)` 时，底层的发生过程：

1.  **Intent Build**: `LogicMiddleware` (IntentBuilder) 记录 `onAction` 和 `run` 的配置。
2.  **Compile**: `ModuleRuntime` 启动时，调用 `LogicMiddleware` 生成 `EffectOp` 树。
3.  **Execute**: `EffectOp.run` 解释执行：
    - 调用 `Flow.fromAction` 创建 Effect Stream。
    - 应用 `debounce` / `filter` 等中间件。
    - 最终在 Effect Runtime (`Runtime.make`) 中 fork 并发的 Fiber 执行 `handler`。

## 4. 维护与演进 (Evolution)

- **新增 Flow 算子**:
  1.  在 `packages/logix-core/src/Flow.ts` 定义 API。
  2.  在 `packages/logix-core/src/internal/runtime/core/FlowRuntime.ts` 实现算子逻辑。
  3.  在 `packages/logix-core/src/internal/runtime/core/LogicMiddleware.ts` 暴露给 `$` 链式调用。
- **修改核心原语**:
  - 涉及 `EffectOp` 结构变更时，需同步 `EffectOpCore.ts` (Interpreter) 和 `LogicMiddleware.ts` (Compiler)。
