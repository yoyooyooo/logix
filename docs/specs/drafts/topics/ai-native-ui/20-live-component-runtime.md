---
title: Live Component Triad (UI + Data + Behavior)
status: draft
version: 1.0
related: []
---

# Live Component Triad: The "Soul" of AI-Generated UI

> **Status**: Consolidated (Runtime Implementation)
> **Context**: `v3/ai-native`
> **Previous**: `L5/live-component-triad.md`

本文档详细阐述 **Live Component Triad (活体组件三元组)** 模式。
它是 `S.AISlot` 在 **output="live-component"** 模式下的具体实现载体。

## 1. The Concept

当 `S.AISlot` 需要填充的不仅仅是静态 UI，而是包含复杂交互逻辑的完整功能模块时，AI 会生成一个 **Live Component**。

它由三个维度的 Intent 共同支撑：

```mermaid
graph TD
    Slot[S.AISlot] -->|Expands To| Triad

    subgraph Live Component
        UI[UI Intent (Skeleton)] -->|Body| Triad
        Data[Data Intent (Schema)] -->|Memory| Triad
        Behavior[Behavior Intent (Logic)] -->|Reflex| Triad
    end

    Triad -->|Runtime Injection| Runtime[Draft Runtime]
```

### 1.1 UI Intent (The Body) -> `S` Code
*   **Definition**: 使用 `S` 命名空间描述的骨架代码。
*   **Format**: TSX (Code-First).
*   **Example**:
    ```tsx
    (props) => (
      <S.Container>
        <S.Input bind="model:username" />
      </S.Container>
    )
    ```

### 1.2 Data Intent (The Memory)
*   **Definition**: 组件运行所需的临时状态模型。
*   **Mapping**: 直接映射为 **Draft Schema**。
*   **Example**:
    ```json
    {
      "step": "number",
      "formData": {
        "username": "string",
        "agreed": "boolean"
      }
    }
    ```

### 1.3 Behavior Intent (The Reflex)
*   **Definition**: 组件的交互逻辑与状态流转规则。
*   **Mapping**: 直接映射为 **Draft Logic**。
*   **Example**:
    ```json
    {
      "onNext": "if (step < 3) step++",
      "onSubmit": "validate(formData) && commit()"
    }
    ```

## 2. Runtime Implementation

在运行时，平台通过 **Runtime Injection** 技术，将这三者缝合为一个 React 组件。

### 2.1 The `LiveComponent` Host

```tsx
// 伪代码：平台提供的通用宿主组件
const LiveComponent = ({ intent }) => {
  // 1. 动态构造 Draft
  const draftDef = useMemo(() => createDraftFromIntent(intent.data, intent.behavior), [intent]);

  // 2. 启动 Draft Runtime
  const { state, actions } = useDraft(draftDef);

  // 3. 渲染 UI (Skeleton -> Flesh) 并注入 Soul
  const Skeleton = compileSkeleton(intent.ui); // Compile TSX string to Component

  return (
    <Logix.Provider model={state} actions={actions}>
      <Skeleton />
    </Logix.Provider>
  );
};
```

### 2.2 AI Workflow

1.  **User Prompt**: "帮我生成一个请假申请单，需要填姓名、时间，提交时校验时间不能在过去。"
2.  **AI Generation**: 生成包含 `ui`, `data`, `behavior` 的完整 JSON。
3.  **Preview**: 平台前端直接将 JSON 喂给 `LiveComponent`，用户立即可以操作（填写、校验、提交）。
4.  **Refine**: 用户说“加一个备注字段”，AI 更新 `ui` 和 `data` 部分，界面实时刷新且状态保留（如果支持 HMR）。

## 3. Why This Matters?

*   **Zero Boilerplate**: 用户（和 AI）不需要写 `Draft.make`, `useDraft`, `type Schema` 等样板代码。
*   **Atomic Delivery**: AI 交付的是一个“活物”，而不是一堆需要开发者手动组装的零件。
*   **Sandboxed**: 每个 Live Component 都有独立的 Draft Scope，互不干扰，非常适合 AI 试错与预览。

**结论**: Live Component Triad 是 Draft Pattern 在 AI Native 时代的**终极形态**。
