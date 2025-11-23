---
title: 97 · 统一逻辑运行时 (Unified Logic Runtime)
status: draft
version: 6 (Hybrid-Visual)
---

> 本文档描述了 Logic Intent (Behavior) 的运行时实现。在 v3 模型下，我们采用统一的 **Flow DSL** 作为逻辑真理，由编译器根据上下文自动分发。

## 1. 核心理念：One Flow, Any Runtime

Logic Intent 的 Impl 层是 **Flow DSL**。它是一种声明式的、图状的业务逻辑描述。

## 2. 动态性与热更新 (Dynamism & HMR)

为了支持“全双工编排”和极致的开发体验 (DX)，Logix Runtime 必须具备动态加载与热替换能力。

### 2.1 Interpreter Mode (开发态)

在开发环境中，Logix 支持直接解释执行 Intent JSON，无需编译为 TS 代码。这实现了 **0 延迟** 的图码同步。

### 2.2 Hot Swapping & State Migration (热替换与状态迁移)

当 Logic 发生变更时（例如用户在画布上修改了流程），Logix 不仅要替换 Rule，还要**保留当前状态**。

```typescript
// Logix 内部逻辑
function replaceRule(ruleId, newRule) {
  // 1. 暂停旧 Rule，导出 State 快照
  const snapshot = store.snapshot(ruleId);
  
  // 2. 卸载旧 Rule
  store.removeRule(ruleId);
  
  // 3. 挂载新 Rule，注入快照
  // Logix 会尝试按 Path 匹配恢复状态
  store.addRule(newRule, { initialState: snapshot });
}
```

**迁移策略**：
*   **Exact Match**: 路径完全一致，直接恢复。
*   **Fuzzy Match**: 路径部分一致（如数组索引变了），尝试智能恢复。
*   **Mismatch**: 路径不存在，丢弃该部分状态。

### 2.3 Vite HMR 集成

平台提供 Vite 插件，监听 `.flow.ts` 或 Intent JSON 的变更，自动触发热替换。

## 3. 图码同步原理 (Code <-> Graph)

平台利用 **AST 锚点 (Anchors)** 实现代码与画布的无损同步。

*   **Code -> Graph**: 解析带有 `@intent` 标记的代码块，重建图结构。
*   **Graph -> Code**: 修改图结构后，利用 `ts-morph` 精准修改对应的 AST 节点。

### 3.1 混合可视化 (Hybrid Visualization)

运行时支持三种级别的可视化呈现：

1.  **White Box (Managed)**: 标准 DSL 节点。完全可视化，支持拖拽、参数配置。
2.  **Gray Box (Ejected)**: 结构已知但参数被人工修改的节点。显示为“已修改”，仅允许查看代码或重置。
3.  **Black Box (Raw)**: 纯手写的 Effect 代码块。在图中显示为代码编辑器组件，支持直接编写 TS 代码。

## 4. 运行时分发 (Runtime Dispatch)

编译器分析 Flow 中的节点类型，自动决定代码生成的目标环境：

*   **Logix Engine (前端)**：纯 UI 逻辑。
*   **Effect Flow Runtime**：纯后端逻辑。
*   **Hybrid**：混合逻辑（Logix 负责 UI + Remote Call）。

## 5. Effect-TS 的角色

无论是在前端 Logix 还是后端 Runtime，我们都推荐使用 **Effect-TS** 作为底层的执行引擎。
