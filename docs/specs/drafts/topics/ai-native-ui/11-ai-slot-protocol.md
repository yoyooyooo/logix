---
title: AI Slot Protocol (S.AISlot)
status: draft
version: 1.0
related: []
---

# AI Slot Protocol: The "Prompt-in-Code"

> **Status**: Consolidated (Protocol)
> **Context**: `v3/ai-native`
> **Previous**: `L5/ai-slot-protocol.md`

本文档定义 **`S.AISlot`** 协议。这是一个特殊的 Skeleton 节点，用于在代码中显式声明“此处应由 AI 填充”。

## 1. The `S.AISlot` Definition

`S.AISlot` 本质上是一个 **Structured Prompt**。它不渲染任何具体 UI，而是携带元数据，等待被“消费”并替换为真实代码。

### 1.1 Signature

```typescript
namespace S {
  export const AISlot: React.FC<{
    /**
     * 意图描述：告诉 AI 这里应该放什么
     * @example "一个用于展示用户头像和昵称的卡片"
     */
    intent: string;

    /**
     * 上下文数据：提供给 AI 的输入变量
     * @example { user: model.user }
     */
    context?: Record<string, any>;

    /**
     * 约束条件：限制 AI 生成的边界
     * @example "必须使用 AntD 组件，高度不超过 100px"
     */
    constraints?: string[];

    /**
     * 期望输出类型：
     * - "ui": 静态 UI 代码 (Flesh)
     * - "live-component": 包含状态与逻辑的完整组件 (Triad)
     * - "logic": 纯逻辑代码
     */
    output?: 'ui' | 'live-component' | 'logic' | 'text';
  }>;
}
```

### 1.2 Usage Example

```tsx
export const UserProfile = () => (
  <S.Container>
    <S.Header title="Profile" />

    {/* 显式留白，等待 AI 填充 */}
    <S.AISlot
      intent="展示用户详细信息，包含头像、积分和最近动态"
      context={{ user: model.user, activities: model.recentActivities }}
      constraints={['使用卡片布局', '头像圆形显示']}
    />

    <S.Action intent="logout">Logout</S.Action>
  </S.Container>
);
```

## 2. Consumption Models

`S.AISlot` 是一段“休眠”的代码，它有两种“唤醒”方式：

### 2.1 Mode A: Local Dev (Copilot Expansion)

开发者在 IDE 中编写代码时使用。

*   **Trigger**: 开发者写下 `<S.AISlot ... />`，然后触发 IDE 插件（或 Cursor/Copilot）。
*   **Process**:
    1.  IDE 读取 `intent`, `context`, `constraints`。
    2.  IDE 抓取当前文件上下文 + Design System 文档。
    3.  LLM 生成具体的 React 代码。
*   **Result**: `<S.AISlot>` 被**永久替换**为生成的代码（Flesh）。
    ```diff
    - <S.AISlot intent="展示用户..." />
    + <div className="user-card">
    +   <Avatar src={user.avatar} />
    +   ...
    + </div>
    ```

### 2.2 Mode B: Platform Runtime (Just-in-Time Generation)

在低代码平台或动态运行环境中，`S.AISlot` 保留在代码中，在运行时动态解析。

*   **Trigger**: 页面加载或组件渲染时。
*   **Process**:
    1.  **Runtime Engine** 遇到 `S.AISlot`。
    2.  调用后端 **LLM Service** (Logix AI Gateway)。
    3.  LLM 实时生成 UI 结构 (JSON or Component)。
    4.  Runtime 动态挂载生成的组件。
*   **Value**: 实现 **"千人千面"** 或 **"动态生成的 UI"**。

## 3. Advanced: The "LLM Tool" Wrapper

我们可以将 `S.AISlot` 包装为 LLM 可调用的 Tool。

### 3.1 Scenario
当我们在一个 Chat Interface 中，用户问：“帮我分析一下这个用户的消费习惯。”

### 3.2 Implementation
系统不仅返回文本分析，还返回一个包含 `S.AISlot` 的 UI 描述：

```json
{
  "message": "根据分析，该用户偏好...",
  "ui_attachment": {
    "type": "S.AISlot",
    "props": {
      "intent": "生成一个消费趋势图表，支持按月切换",
      "context": { "data": [...] },
      "output": "live-component" // 请求生成 Live Component Triad
    }
  }
}
```

前端 Runtime 接收到这个 Tool Output，自动调用 Mode B 流程，生成并挂载一个 **Live Component** (UI + Draft State + Logic)，从而在对话框中渲染出一个动态生成的、可交互的图表。

**结论**:
`S.AISlot` 是连接 **Static Code** 与 **Generative AI** 的虫洞。
*   在开发时，它是 **Prompt Template**。
*   在运行时，它是 **Dynamic UI Placeholder**。
