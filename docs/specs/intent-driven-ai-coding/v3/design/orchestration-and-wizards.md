---
title: 编排与向导交互 (Link & Wizards)
status: draft
version: 3 (Auto-Generated)
---

> **核心理念**：编排即配置。通过 `definePattern` 提供的 Schema，平台自动生成配置向导 (Wizard)，让复杂的逻辑编排变成简单的表单填写。
> **术语注**：本文档中的“编排”在架构实体上对应 **Link**。Link 在运行时并非独立原语，而是 **Logic** 的一种特殊形态（跨模块协作），代码上体现为 `$.use()` + `$.on()` 的组合。

## 1. 自动化向导 (Auto-Generated Wizards)

在 v3 架构中，我们不再手动开发 Wizard UI。一切 UI 均由 Schema 驱动。

### 1.1 驱动源：`PatternSpec.config`

```typescript
// Pattern 定义
config: Schema.Struct({
  delay: Schema.Number.pipe(Schema.default(500)),
  target: Schema.String
})
```

### 1.2 渲染引擎
平台内置 **Schema Form Renderer**，将上述 Schema 渲染为：
*   `delay`: 数字输入框 (默认值 500)。
*   `target`: 文本输入框 (或下拉选，如果使用了 Enum)。

## 2. 编排流程 (The Link Flow)

### 2.1 槽位识别 (Slot Recognition)
平台分析代码，识别出可以插入逻辑的“空位”：
*   `yield* flow.fromAction(a => a.type === 'click').pipe(/* Slot */)`
*   `yield* $.match(cond).when(true, ...).when(false, ...)`

### 2.2 AI 推荐 (AI Recommendation)
用户点击槽位，AI 分析上下文 (Context) 并推荐 Pattern。

*   **Context**: "这是一个提交按钮的点击事件"。
*   **Recommendation**:
    1. `StandardSubmit` (90%)
    2. `OptimisticUpdate` (60%)

### 2.3 填表 (Configuration)
用户选择 `StandardSubmit`，弹出自动生成的 Wizard 表单。用户填写参数。

### 2.4 代码生成 (Codegen)
确认后，平台生成代码并插入槽位：

```typescript
// Before
yield* flow.fromAction(a => a.type === 'click').pipe(flow.run(Effect.void));

// After (AI Generated)
yield* flow.fromAction(a => a.type === 'click').pipe(
  flow.run(StandardSubmit({ service: "Order", method: "create" }))
);
```

## 3. 混合视图交互 (Hybrid Interaction)

### 3.1 宏观编排 (L2 View)
在 L2 视图中，用户看到的是 **Link Node** 或 **Pattern Block**。连线表示 Pattern 之间的信号流。

### 3.2 微观透视 (L3 View)
用户可以双击 Pattern Block 进入 L3 视图。
*   **Managed Pattern**: 显示为只读的 DSL 流程图。用于理解内部逻辑。
*   **Ejected Logic**: 显示为可编辑的 DSL 节点或代码编辑器。

## 4. AI 辅助重构 (AI Refactoring)

AI 不仅能生成，还能重构。

*   **Extract Pattern**: 选中一段散乱的 DSL 节点 -> "Extract to Pattern" -> AI 生成 `definePattern` 代码。
*   **Upgrade Pattern**: 当 Pattern 库更新时，AI 自动扫描代码，提示升级并迁移参数。
