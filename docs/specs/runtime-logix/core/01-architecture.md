# 架构总览 (Architecture Overview)

> **Status**: Definitive (v3 Effect-Native)  
> **Date**: 2025-11-24  
> **Note**: 本文基于 v3 Effect-Native 范式，描述了由 **Store / Logic / Flow / Control** 四大运行时原语构成的核心架构。`Pattern` 作为一种 `(input) => Effect` 的函数封装风格，在平台层被视为可复用的资产。所有术语和类型定义以 `docs/specs/intent-driven-ai-coding/v3/effect-poc` 中的 PoC 为最新事实源。

## 1. 总体架构分层

Logix v3 采用 **Effect-Native** 架构，构建了一个由 **Store**, **Logic**, **Flow**, **Control** 四大运行时原语组成的自洽业务世界；Pattern 作为资产概念存在于平台层，用于包装 pattern-style 的 `(input) => Effect` 长逻辑。

```mermaid
graph TD
    Store[Store.Runtime<State,Action>] -->|Provides| Flow[Flow Sources]
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
| **本质** | `Store.Runtime<S,A>` + `Layer` | `Effect<A,E,R>`（约定 Env = `Logic.Env<Sh,R>`） | `Stream<T>` + `Flow.Api` | `Effect` 组合器集合 (`Control.Api`) |

### 2.2 Pattern 在架构中的位置

*   **没有 Store**: 状态无处安放，生命周期无法管理 (Memory Leak)。  
*   **没有 Logic**: 无法安全地修改状态，无法追踪因果链。  
*   **没有 Flow**: 无法处理复杂的并发竞态 (Race Condition)。  
*   **没有 Control**: 无法表达清晰的分支/错误/并发结构，调试和图码同步都困难。  

Pattern 则作为**资产级概念**存在：当某个 pattern-style `(input) => Effect` 在平台侧被赋予 id/version/configSchema 等元信息时，它就成为可配置、可拖拽的 PatternAsset；但在 runtime-core 中，它始终只是普通的 Effect 函数。

### 2.3 核心运行机制 (Runtime Mechanism)

Logix v3 的核心能力，可以理解为一种基于 Effect-TS `Context` / `Tag` 的「上下文隐形传态」：

- `Logic.forShape<Sh,R>()` 并不会直接拿到某个具体的 Store 实例，而是构造了一组 **在 `Logic.Env<Sh,R>` 上运行的访问器**（`state / actions / flow / control / services`）。  
- `Store.make(StateLayer, ActionLayer, ...logics)` 在内部会创建对应的 `Store.Runtime<S,A>`，并在其 Scope 中通过 `Effect.provideService(Logic.RuntimeTag, runtime)` 注入到环境。  
- 当挂在同一棵 Store 上的多个 Logic 开始运行时，它们内部各自文件里的 `const $ = Logic.forShape<Shape, R>()` 会在运行时从同一个 Env 中读取 `Logic.RuntimeTag`，从而 **共享同一颗 State 与同一条 actions$ / changes$ 流**。

效果是：

- 逻辑可以在物理上拆分为多个文件 / 模块（每个文件都有自己的 `$ = Logic.forShape<Shape,R>()`）；  
- 只要它们的 Shape / Env 一致，并且一起传给同一个 `Store.make`，运行时就会在同一个 Scope 中启动这些 Logic，它们看到的是同一棵 Store；  
- 若多个逻辑关注的是完全不同的领域（Shape 不同），则推荐拆成多棵 Store，通过 `Intent.Coordinate` / 协调 Pattern 在 L2 层进行跨 Store 协作。

这套机制实现了「逻辑的物理拆分，状态的逻辑单源」，是支撑大规模应用开发与跨文件协作的关键架构特性。

## 3. 仓库结构规划

```text
packages/
  logix/                # 核心引擎
    src/
      store.ts          # Store.Shape / Store.Runtime / Store.Tag / Store.make
      logic.ts          # Logic.Env / Logic.Fx / Logic.forShape / Logic.make
      flow.ts           # Flow.Env / Flow.Api
      control.ts        # Control.Api
  form/                 # 表单领域包
  react/                # React 适配包
```
