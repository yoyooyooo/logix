--- 
title: 06 · 全双工引擎：静态分析与锚点系统 (The Full-Duplex Engine)
status: draft
version: 14 (Effect-Native)
---

> **核心目标**：实现 Intent (图) 与 Code (码) 的**无损双向同步**。在 v3 Effect-Native 架构下，Parser 聚焦于识别 **Layer 组合** 与 **Stream 管道**。

## 1. 核心理念：架构即视图 (Architecture as View)

我们不再试图解析每一行代码。我们只关注架构的骨架：

*   **Store 组装**: 识别 `Store.make` 和 `layers` 数组。
*   **Logic 流转**: 识别 `Flow.from(...).pipe(...)` 结构。

## 2. 静态分析引擎 (The Static Analysis Engine)

### 2.1 识别规则 (Recognition Rules)

Parser 通过识别特定的 **AST Pattern** 来提取语义：

1.  **Flow Pipeline**:
    *   匹配 `Flow.from(Trigger).pipe(...)`。
    *   提取 `pipe` 中的算子链，构建 `Trigger -> Op -> Effect` 的流程图。

2.  **Pattern 挂载**:
    *   匹配 `flow.run(PatternName(config))`。
    *   提取 `config` 对象，用于生成属性面板。

3.  **Layer 定义**:
    *   匹配 `Store.Logic.make(...)`。
    *   将其识别为一个逻辑模块。

### 2.2 降级策略 (Degradation Strategy)

对于无法识别的 Effect 代码（如复杂的 `Effect.gen` 内部逻辑），Parser 将其标记为 **Black Box** (黑盒节点)。

*   **画布表现**: 显示为代码编辑器组件。
*   **交互**: 允许用户直接编辑 TS 代码，但不提供可视化连线。

## 3. 锚点系统 (The Anchor System)

为了辅助 Parser 定位，我们依然使用注释锚点。

```typescript
// @intent-rule: auto-save { x: 100, y: 200 }
yield* Effect.all([
  flow.from(api.action('update')).pipe(
    flow.debounce(1000),
    flow.run(AutoSavePattern({ interval: 1000 }))
  )
]);
```

## 4. 全双工工作流 (The Workflow)

1.  **Code -> Graph**: Parser 提取 `Flow` 管道，构建逻辑拓扑。
2.  **Graph -> Code**: 用户修改图结构（如拖拽 Debounce 节点），Generator 修改对应的 `pipe` 参数。
