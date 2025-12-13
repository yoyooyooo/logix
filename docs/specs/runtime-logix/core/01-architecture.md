# 架构总览 (Architecture Overview)

> **Status**: Definitive (v3 Effect-Native)
> **Date**: 2025-11-24
> **Audience**: 应用/业务开发者、库作者与架构师的共同“地图”，从概念层俯视 Logix 引擎。
> **Note**: 本文基于 v3 Effect-Native 范式，描述了由 **Store / Logic / Flow / Control** 四大运行时原语构成的核心架构。`Pattern` 作为一种 `(input) => Effect` 的函数封装风格，在平台层被视为可复用的资产。类型以 `@logix/core`（`packages/logix-core/src`）为准，PoC 场景以 `examples/logix` 为准。

## 1. 总体架构分层

Logix v3 采用 **Effect-Native** 架构，构建了一个由 **Store**, **Logic**, **Flow**, **Control** 四大运行时原语组成的自洽业务世界；Pattern 作为资产概念存在于平台层，用于包装 pattern-style 的 `(input) => Effect` 长逻辑。

```mermaid
graph TD
Store[Runtime (State,Action)] -->|Provides| Flow[Flow Sources]
    Store -->|Provides| StateApi[Logic.state/actions]

    Logic[User Logic (Effect)] -->|Consumes| StateApi
    Logic -->|Consumes| Flow
    Logic -->|Consumes| Control[Control Ops]
    Logic -->|Consumes| Services[Effect.Services & Config]

    Pattern[Pattern-style Logic (input => Effect)] -->|Consumes| Logic.Env (Store + Services)
    Pattern -->|Optional| PatternAsset[Pattern Asset (id/config)]
```

## 2. Logix 核心原语 (Core Primitives)

### 2.1 元素对比矩阵

| 维度 | Store (容器) | Logic (程序) | Flow (流) | Control (结构) |
| :--- | :--- | :--- | :--- | :--- |
| **语义** | **World**<br>运行环境 | **Behavior**<br>业务规则与副作用 | **Current**<br>触发与时间 | **Structure**<br>分支/错误/并发形态 |
| **能力** | 状态持有<br>依赖注入<br>生命周期 | 修改状态<br>调用服务<br>组合 Flow/Control | 过滤/防抖<br>并发控制<br>时序编排 | 分支逻辑<br>错误边界<br>并行聚合 |
| **平台支撑** | **架构视图**<br>展示应用结构 | **调试视图**<br>展示状态/Env 变更 | **流程视图**<br>展示逻辑连线 | **结构视图**<br>展示分支/错误域/并发结构 |
| **本质** | 领域模块的运行时容器 + `Layer` | `Effect<A,E,R>`（约定 Env = `Logic.Env<Sh,R>`） | `Stream<T>` + `Flow.Api` | `Effect` 组合器集合 (`Control.Api`) |

### 2.2 Pattern 在架构中的位置

*   **没有 Store**: 状态无处安放，生命周期无法管理 (Memory Leak)。
*   **没有 Logic**: 无法安全地修改状态，无法追踪因果链。
*   **没有 Flow**: 无法处理复杂的并发竞态 (Race Condition)。
*   **没有 Control**: 无法表达清晰的分支/错误/并发结构，调试和图码同步都困难。

Pattern 则作为**资产级概念**存在：当某个 pattern-style `(input) => Effect` 在平台侧被赋予 id/version/configSchema 等元信息时，它就成为可配置、可拖拽的 PatternAsset；但在 runtime-core 中，它始终只是普通的 Effect 函数。

### 2.3 核心运行机制 (Runtime Mechanism)

Logix v3 的核心能力，可以理解为一种基于 Effect-TS `Context` / `Tag` 的「上下文隐形传态」，
但在当前 PoC 中，这一能力**通过 `Logix.Module` + `Module.logic(($)=>Effect.gen(...))` + Bound API `$` 落地**。

- `Logix.Module.make('Id', { state, actions })` 定义领域模块的 Schema 形状；
- `Module.logic(($)=>Effect.gen(...))` 为该模块挂载 Logic 程序，并在回调参数中注入预绑定的 Bound API `$`；
- `Module.live(initial, ...logics)` 在内部会创建对应的运行时容器（ModuleRuntime），并在其 Scope 中启动所有 Logic 程序。

效果是：

- 逻辑可以在物理上拆分为多个文件 / 模块，但在实现层通过 `Module.logic(($)=>...)` 显式挂载到同一个 Module 上，从而共享同一棵 State 与同一条 actions$ / changes$ 流；
- 若多个逻辑关注的是完全不同的领域（Shape 不同），则推荐拆成多个 Module，通过 L2 IntentRule（例如 `$.use(OtherModule)` + Fluent DSL 将源 Module 的 `changes / actions` 映射为目标 Module 的 `dispatch`）或协调 Pattern 在 L2 层进行跨 Module 协作。

> 说明：早期草案中曾构想过基于 `Logic.RuntimeTag` 的 Env-First Bound API 工厂，用于从 `Logic.Env<Sh,R>` 中“隐式”获取 Runtime 并构造 `$`。该设想目前仅保留在 drafts 中，当前 PoC 的运行时契约一律以 `Module.logic(($)=>...)` 与 `BoundApi` 为准。

## 3. 仓库结构规划

```text
packages/
  logix/                # 核心引擎
    src/
      store.ts          # 状态容器与运行时能力定义（内部实现细节）
      logic.ts          # Logic.Env / Logic.Of / Bound API $
      flow.ts           # Flow.Env / Flow.Api
      flow.ts           # Flow.Api
  form/                 # 表单领域包
  react/                # React 适配包
```
