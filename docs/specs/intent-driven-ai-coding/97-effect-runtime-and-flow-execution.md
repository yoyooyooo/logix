---
title: 97 · 统一逻辑运行时 (Unified Logic Runtime)
status: living
---

> 本文档描述 Logic Intent (Behavior) 的运行时实现。实现层以 **Store / Logic / Flow** 三大运行时原语为基础，结合 Effect 原生结构化控制流（含 `$.match`/`$.matchTag`）、`Effect.Service`、`Config` 等能力构成统一的 Logic Runtime。具体类型以 `@logix/core`（`packages/logix-core/src`）为准，示例与回归以 `examples/logix` 为准。

## 1. 核心理念：One Logic, Any Runtime

Logic Intent 的 Impl 层是基于 Effect 的 **Bound API (`$`) 与 `Flow` API** 风格的代码：

- Store：通过 Schema 定义 State/Action 形状，并由领域模块的运行时容器提供 `getState / actions / changes$ / ref` 等能力。
  - **Smart Dispatchers**：直接通过 `actions.updateUser(payload)` 调用，替代旧的 `dispatch({ _tag, ... })`。
- Logic：通过 Bound API（`$`）获取上下文。
  - **Unified Trigger**：统一使用 `$.onState(selector)` / `$.onAction(predicate)` / `$.on(stream)` 替代分散的 `whenState/whenAction`。
- Flow：围绕 `actions$ / changes$` 提供有限的时序与并发算子（如 `debounce / throttle / run*`）。
- 结构化控制流：直接使用 `Effect.*`（如 `Effect.catch*` / `Effect.all`）+ `$.match`/`$.matchTag` 表达分支、错误边界与并行结构。

长逻辑本身以 pattern-style 的 `(input) => Effect` 函数存在，可以直接被 Logic 调用，也可以在平台层被资产化。

### 1.1 Flow 术语消歧 (Terminology)

在不同文档中，`Flow` 一词曾被用来指代不同层级的概念，这里统一约定：

- `Logix Flow`：特指前端 Logix Engine 内部的时间轴 / 并发原语集合，即 `.codex/skills/project-guide/references/runtime-logix/logix-core/api/03-logic-and-flow.md` 中的 `Flow.Api`（`fromAction / fromState / debounce / run*` 等）。代码层面通过 `flow.*` 命名空间访问。
- `Effect Flow Runtime`：特指运行在 BFF / Server 侧的 Effect 驱动业务流程运行时（例如 `.flow.ts` 中编排的跨系统长流程）。为了避免歧义，后续文档中更倾向使用 **Flow Runtime** 或 **ServerFlow Runtime** 来称呼它，而不直接写 `Flow`。
- `Flow DSL`：指 YAML/JSON 级别的编排描述（历史概念），用于 Flow 结构的抽象表达，便于 Intent 与工具链进行结构化对齐。

后续涉及“Flow”的文档应显式使用上述术语之一，并在首次出现时指明是 `Logix Flow` 还是 `Flow Runtime`，避免再出现混用。

## 2. 动态性与热更新 (Dynamism & HMR)

为了支持“全双工编排”和极致的开发体验 (DX)，Logix Runtime 必须具备动态加载与热替换能力。

### 2.1 Direct Execution (开发态)

在开发环境中，Logix 直接运行 TypeScript 编译后的 JS 代码。**不再有中间层的 JSON 解释器**。这实现了 **Native Performance**。

### 2.2 HMR 策略：安全重启与状态协调

Logix 的 HMR 建立在 Effect 强大的 **Scope (资源作用域)** 机制之上，采用“基线兜底 + 渐进增强”的策略。

#### 2.2.0 心智模型：Session 即事务 (Mental Model: Session as Transaction)

从计算机科学角度看，Session 本质上是一个 **长活的交互式事务 (Long-Lived Interactive Transaction)**，它在 UI 层实现了类似数据库 ACID 的特性：

-   **Isolation (隔离性)**：Session 内的临时交互状态对外部 Module 不可见，避免了“脏读” (Dirty Read)。
-   **Atomicity (原子性)**：Session 只有“提交 (Result Action)”和“销毁 (Rollback)”两种终态。中间步骤的取消会自动清理所有临时状态，无需手动 GC。

> **Future Roadmap**: 在未来阶段中，我们计划利用 Effect-TS 的 **STM (Software Transactional Memory)** 模块来物理实现这一抽象，提供更强的原子性保证。但在当前阶段，`Scope` + `Ref` 是性价比最高的工程实现。

#### 2.2.1 基线策略：安全重启 (Baseline: Safe Restart)

这是 Logix HMR 的默认行为，确保了**绝对的安全性**（无内存泄漏、无僵尸逻辑）。

*   **机制**:
    1.  **Teardown**: 当 Logic 变更时，Runtime 调用旧 Fiber 的 `Scope.close()`。Effect 运行时保证所有挂起的资源（Timer, Socket, File Handle）被强制且优雅地关闭。
    2.  **Reboot**: 使用新定义启动新 Fiber。
    3.  **Data Retention**: **Store 中的数据状态 (Data State) 100% 保留**。用户填写的表单、加载的数据不会丢失。
*   **体验**: 逻辑流程会重置（例如倒计时重新开始），但业务数据不丢。这对于绝大多数调试场景已足够完美。

#### 2.2.2 高级策略：三级状态协调 (Advanced: Tri-Level Reconciliation)

在基线策略之上，针对追求极致体验的场景，Runtime 尝试进行更细粒度的状态保留（Optional）：

1.  **Level 1: 参数级热更 (Hot Parameter Swap)**
    *   当仅修改节点的**配置参数**（如 `debounce` 时间）时，不重启 Fiber，仅更新 `FiberRef`。正在运行的逻辑（如倒计时）无缝切换参数。

2.  **Level 2: 结构兼容性重构 (Structural Reconciliation)**
    *   当节点结构微调时，重启 Fiber，但尝试将旧的**执行状态** (Execution State) 映射给新 Fiber。

3.  **Level 3: 显式迁移 (Explicit Migration)**
    *   当逻辑质变时，允许开发者提供 `migrate(oldState)` 函数进行手动迁移。

### 2.3 Vite HMR 集成

平台提供 Vite 插件，监听 `.logic.ts` 的变更，自动触发上述协调流程。

## 3. 图码同步原理 (Code <-> Graph)

平台利用 **Static Analysis (静态分析)** 实现代码与画布的无损同步。

*   **Code -> Graph**: Parser 提取 `Flow` 调用链，构建内存图结构。
*   **Graph -> Code**: 修改图结构后，利用 `ts-morph` 精准修改对应的 AST 节点。

### 3.1 混合可视化 (Hybrid Visualization)

运行时支持三种级别的可视化呈现：

1.  **White Box (Managed)**: 标准 DSL 节点。完全可视化，支持拖拽、参数配置。
2.  **Gray Box (Ejected)**: 结构已知但参数被人工修改的节点。显示为“已修改”，仅允许查看代码或重置。
3.  **Black Box (Raw)**: 纯手写的 Effect 代码块。在图中显示为代码编辑器组件，支持直接编写 TS 代码。

## 4. 运行时分发 (Runtime Dispatch)

编译器分析 Logic 中的节点类型，自动决定代码生成的目标环境：

*   **Logix Engine (前端)**：纯 UI 逻辑。
*   **Effect Flow Runtime**：纯后端逻辑。
*   **Hybrid**：混合逻辑（Logix 负责 UI + Remote Call）。

## 5. Effect-TS 的角色

无论是在前端 Logix 还是后端 Runtime，我们都推荐使用 **Effect-TS** 作为底层的执行引擎。

## 6. 高级模式：瞬时交互 (Advanced Pattern: Ephemeral Interaction)

> **解决痛点**：防止交互过程中的临时状态（如拖拽坐标、向导步骤）污染持久化的 Module State。

> 现状（与实现对齐）：Draft/Session 作为专门原语尚未纳入当前主线范围；`@logix/core` 当前没有 `$.draft.*` API。

在当前实现中，推荐用“Local Module / 临时 Module + 显式提交”的方式表达瞬时交互：

1. 为向导/拖拽等交互期状态单独建一个 Local Module（或专门的临时 Module），并把其生命周期绑定到页面/组件 Scope；
2. 通过显式 Commit Action 将必要结果写回主 Module，保持“入口级事务”的不变量。

Draft 方向的草案与边界分析见 `docs/specs/drafts/topics/draft-pattern/*`；范围裁决见 `.codex/skills/project-guide/references/runtime-logix/logix-core/impl/08-scope-lock.md`。

## 7. 并发、背压与内存安全 (Concurrency, Backpressure & Memory Safety)

在“不引入持久化存储”的前提下，Logix Runtime 必须**硬防积压导致的内存增长**。典型风险来自两类积压：

1. **事件积压（Event Backlog）**：上游触发（Action / State Change / Service Callback）产生速度大于 watcher 的消费速度时，事件会在通道内堆积。
2. **执行积压（In-flight Backlog）**：`runParallel` / `runLatest` / 频繁 `runFork` 等写法会为每次触发创建执行 Fiber；当触发速率大于完成速率时，in-flight fibers 会线性增长，并可能伴随“大量短命 fiber”（创建后很快结束/被取消）的洪峰。

术语定义与事务窗口约束见 `.codex/skills/project-guide/references/runtime-logix/logix-core/concepts/10-runtime-glossary.md` 的 “StateTransaction 与逻辑入口（Logical Entry）” 与 “背压（Backpressure）与必达通道（Lossless Channels）”。

### 7.1 通道分级：必达 vs 可降级

- **业务 Action / 关键 Task 通道（必达，Lossless）**
  - 语义：不能丢、不能静默跳过；同一 module instance 内必须保持可解释的顺序语义（至少 FIFO）。
  - 代价：在过载时必须对入口施加背压（Backpressure）让上游等待，而不是无限堆积内存。
- **诊断 / Devtools / Trace 通道（可降级，Lossy）**
  - 允许采样、Ring Buffer、降级（例如只保留错误及其前序 N 步）。
  - 但必须对“被采样/被丢弃/被合并”的事实显式计数并可观测，避免出现不可解释的隐式行为。

### 7.2 必达背压的硬约束

- **MUST**：必达通道必须有界（bounded），禁止 `unbounded` 队列在热路径上无限增长。
- **MUST**：背压等待不得发生在 StateTransaction 的事务窗口内（事务窗口禁止 IO/等待）。
  - 若需要背压，应把等待放在逻辑入口 API 的外侧；
  - 或采用“事务内只 enqueue（非阻塞）→ 事务外 drain（可等待）”的桥接结构，将背压与事务窗口物理隔离。
- **MUST**：背压/过载相关诊断必须 Slim 且可序列化，并带稳定锚点（instanceId/txnSeq/opSeq/linkId 等）：队列水位、等待时长、最慢订阅者/最慢 handler 线索等。

### 7.3 对业务写法的影响（落地准则）

- 默认 `run`（串行）作为安全基线；并发必须显式选择 `runParallel / runLatest / runExhaust`。
- 高频输入/联动（搜索、拖拽、输入法）优先 `debounce / throttle + runLatest`，并将非关键副作用（trace/埋点）拆到可降级通道。
- “不能重复提交”的入口用 `runExhaust`；需要高吞吐的**非关键副作用**才用 `runParallel`。
- 高频派发优先用 `dispatchBatch` / 合并一次 `runFork`，降低短命 Fiber 的创建压力。

### 7.4 当前实现与迁移提示（Non-Blocking）

当前实现仍存在若干默认 `unbounded` 的通道与无界并发算子；本节为目标语义裁决：

- 引擎侧需要引入“业务必达背压通道”的有界实现，并与事务窗口做物理隔离；
- 同时保持诊断通道可采样/降级，并将其与业务通道解耦，避免诊断拖垮业务。
