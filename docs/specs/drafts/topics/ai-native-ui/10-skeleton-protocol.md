---
title: Skeleton Protocol & Integration
status: draft
version: 1.0
related: []
---

# Skeleton Protocol: The "S" Namespace

> **Status**: Consolidated (Protocol & Integration)
> **Context**: `v3/ai-native`
> **Previous**: `L5/ui-intent-skeleton-protocol.md`, `L5/logix-ui-integration.md`

本文档定义 **Skeleton-First Protocol** 及 **`S` 命名空间**。

## 1. The Philosophy: Skeleton vs Flesh vs Soul

一个完整的 UI 组件由三个层次构成：

| Layer | Metaphor | Responsibility | Owner | Example |
| :--- | :--- | :--- | :--- | :--- |
| **L0: Skeleton** | **骨架** | **Abstract Intent**: 结构、语义、插槽 | **Human / Logic** | `<S.Input bind="user.name" />` |
| **L1: Flesh** | **血肉** | **Concrete Implementation**: 样式、组件库 | **AI / Designer** | `<AntdInput />` |
| **L2: Soul** | **灵魂** | **Runtime Behavior**: 状态、校验、交互 | **Runtime** | `useModule(UserModule)` |

**核心原则**:
*   **Code is Truth**: UI Intent 是 **TSX 代码**。
*   **Type Safety**: 使用 TypeScript 接口定义 Skeleton 组件的 Props。
*   **Runtime Injection**: 运行时通过 `Context` 将 `<S.Input>` 替换为具体的 `<AntdInput>`。

## 2. The `S` Namespace Definition

`S` 是 **Logix UI Runtime** 提供的一套 **Abstract Component Primitives**。

### 2.1 Import Path
```typescript
import { S } from '@logix/ui';
```

### 2.2 The Primitives (Core Set)
`S` 的设计原则是 **"Semantic over Visual"**。

*   **`S.Container`**: 布局与分组意图 (Card, Modal, Section, Row, Col)。
*   **`S.Input`**: 数据录入意图 (Text, Number, Date, Select)。
*   **`S.Action`**: 交互触发意图 (Button, Link, IconClick)。
*   **`S.Display`**: 数据展示意图 (Text, Tag, Image, List)。
*   **`S.Slot`**: 动态插槽意图。
*   **`S.AISlot`**: AI 生成插槽 (详见 `11-ai-slot-protocol.md`)。

## 3. Integration with Logix (The `bind` Protocol)

`S` 组件通过 `bind` 属性与 Logix 的 Logic/State 层连接。

### 3.1 Binding Syntax
*   **`model:path`**: 绑定到当前上下文的数据模型 (Draft or Store)。
*   **`action:name`**: 绑定到当前上下文的 Action。
*   **`signal:name`**: 绑定到全局 Signal。

### 3.2 Usage Example

```tsx
import { S } from '@logix/ui';
import { UserDraft } from './logic/user-draft';

export const UserEditor = () => {
  // 1. Runtime Injection (Soul)
  const { model, actions } = useDraft(UserDraft);

  // 2. Skeleton Definition (Body)
  return (
    <Logix.Provider model={model} actions={actions}>
      <S.Container intent="form">
        {/* Auto-binds to model.username */}
        <S.Input label="Username" bind="model:username" />

        {/* Auto-binds to actions.submit */}
        <S.Action intent="primary" bind="action:submit">Save</S.Action>
      </S.Container>
    </Logix.Provider>
  );
};
```

## 4. Component Intent (The Contract)

每个 Skeleton Node 需要一个 **Component Intent** 定义，以便 AI 知道如何填充血肉。

```typescript
interface InputIntent {
  capabilities: ['text', 'number', 'password'];
  mappings: {
    value: string;
    onChange: (val: any) => void;
    disabled: boolean;
  };
  description: "用于收集用户输入的原子组件";
}
```

## 5. Runtime Implementation

`S` 组件本质上是 **Context Consumers**。

```tsx
const Input = (props: SkeletonProps) => {
  const runtime = useRuntime();
  const theme = useLogixTheme();

  // 1. Resolve Data Binding
  const value = runtime.resolveValue(props.bind);
  const onChange = runtime.resolveUpdater(props.bind);

  // 2. Resolve Concrete Component (Flesh)
  const ConcreteComponent = theme.components.Input;

  // 3. Render
  return <ConcreteComponent value={value} onChange={onChange} {...props} />;
};
```
