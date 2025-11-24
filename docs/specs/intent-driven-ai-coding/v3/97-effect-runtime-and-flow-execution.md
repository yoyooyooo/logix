---
title: 97 · 统一逻辑运行时 (Unified Logic Runtime)
status: draft
version: 9 (Unified-API)
---

> 本文档描述了 Logic Intent (Behavior) 的运行时实现。在 v3 模型下，我们采用统一的 **LogicDSL** 作为逻辑真理，由 Effect Runtime 直接执行。

## 1. 核心理念：One Logic, Any Runtime

Logic Intent 的 Impl 层是 **LogicDSL**。它是一套基于 TypeScript 的、声明式的业务逻辑原语。

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

*   **Code -> Graph**: Parser 提取 `LogicDSL` 调用链，构建内存图结构。
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
