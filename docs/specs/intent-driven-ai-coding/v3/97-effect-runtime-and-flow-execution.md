--- 
title: 97 · 统一逻辑运行时 (Unified Logic Runtime)
status: draft
version: 11 (Effect-Native)
---

> 本文档描述 Logic Intent (Behavior) 的运行时实现。实现层以 **Store / Logic / Flow** 三大运行时原语为基础，结合 `Control`、`Effect.Service`、`Config` 等能力构成统一的 Logic Runtime。具体类型与 PoC 以 `v3/effect-poc` 下代码为准。

## 1. 核心理念：One Logic, Any Runtime

Logic Intent 的 Impl 层是基于 Effect 的 **`Logic.make` 和 `Flow/flow` API** 风格的代码：  

- Store：通过 Schema 定义 State/Action 形状，并由 `Store.Runtime` 提供 `getState / dispatch / actions$ / changes$ / ref` 等能力；  
- Logic：通过 `Logic.make` 获取 `state / actions / flow / control` 四个命名空间，在 `Effect.gen` 中编排业务逻辑；  
- Flow：围绕 `actions$ / changes$` 提供有限的时序与并发算子（如 `fromAction / fromChanges / debounce / throttle / run / runLatest / runExhaust / runSequence`），并在此基础上提供少量强语义语法糖（如 `andUpdateOnChanges`）；  
- Control：提供结构化的控制流算子（如 `branch / tryCatch / parallel`），用于表达分支、错误域与并行。  

长逻辑本身以 pattern-style 的 `(input) => Effect` 函数存在，可以直接被 Logic 调用，也可以在平台层被资产化。

### 1.1 Flow 术语消歧 (Terminology)

在不同文档中，`Flow` 一词曾被用来指代不同层级的概念，这里统一约定：

- `Logix Flow`：特指前端 Logix Engine 内部的时间轴 / 并发原语集合，即 `runtime-logix/core/03-logic-and-flow.md` 中的 `Flow.Api`（`fromAction / fromChanges / debounce / run*` 等）。代码层面通过 `flow.*` 命名空间访问。  
- `Effect Flow Runtime`：特指运行在 BFF / Server 侧的 Effect 驱动业务流程运行时（例如 `.flow.ts` 中编排的跨系统长流程）。为了避免歧义，后续文档中更倾向使用 **Flow Runtime** 或 **ServerFlow Runtime** 来称呼它，而不直接写 `Flow`。  
- `Flow DSL`：指 YAML/JSON 级别的编排描述（参见 `v1/08-flow-dsl-and-ast.md`），主要用于 Flow 结构的抽象表达，便于 Intent 与工具链进行结构化对齐。  

后续涉及“Flow”的文档应显式使用上述术语之一，并在首次出现时指明是 `Logix Flow` 还是 `Flow Runtime`，避免再出现混用。

## 2. 动态性与热更新 (Dynamism & HMR)

为了支持“全双工编排”和极致的开发体验 (DX)，Logix Runtime 必须具备动态加载与热替换能力。

### 2.1 Direct Execution (开发态)

在开发环境中，Logix 直接运行 TypeScript 编译后的 JS 代码。**不再有中间层的 JSON 解释器**。这实现了 **Native Performance**。

### 2.2 HMR 策略：安全重启与状态协调

Logix 的 HMR 建立在 Effect 强大的 **Scope (资源作用域)** 机制之上，采用“基线兜底 + 渐进增强”的策略。

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
