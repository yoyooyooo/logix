# 领域模型 (Domain Model)

> **Status**: Definitive (v2.0 Dual-Store)
> **Layer**: Form Domain

本文档定义表单引擎在 Logix 之上的数据结构映射与 Action 协议。采用 **Dual-Store (双存储)** 模式以分离业务价值与交互状态。

## 1. 概念映射 (Concept Mapping)

Form 领域对 Logix 的通用概念进行了语义化映射，以区分“容器”与“净荷”。

| Logix Concept | Form Concept | Description |
| :--- | :--- | :--- |
| `stateSchema` | **`dataSchema`** | 定义纯净的业务数据结构 (The Payload) |
| `initialState` | **`initialData`** | 业务数据的初始回填值 (The Value) |
| `State` | **`FormState`** | 包含 Data + UI Meta 的完整容器 |

## 2. 状态架构 (State Architecture)

`makeForm` 内部维护两个逻辑区域，对外暴露统一的 `FormState`。

### 2.1 Data Store (The Truth)
*   **职责**: 仅存储纯净的、可序列化的业务数据。
*   **来源**: 由用户传入的 `dataSchema` 定义。
*   **特性**: 支持持久化、支持 Undo/Redo (Time Travel 仅针对此部分)。

```typescript
// 纯业务数据
type DataState<T> = T;
```

### 2.2 UI Store (The Machinery)
*   **职责**: 存储所有辅助性的 UI 状态、校验结果、交互标记。
*   **来源**: 内部标准定义 (Internal Schema)。
*   **特性**: 瞬态 (Transient)、组件卸载即重置、不参与持久化。

```typescript
interface UIState {
  // 字段元数据 (Key 为扁平化 Path)
  fields: Record<string, {
    touched: boolean;
    dirty: boolean;
    validating: boolean;
    issues: Array<{ code: string; message: string; severity: 'error' | 'warning' }>;
  }>;

  // 全局元数据
  meta: {
    isValid: boolean;
    isSubmitting: boolean;
    isValidating: boolean;
    isDirty: boolean;
    submitCount: number;
    globalErrors: string[];
  };
}
```

### 2.3 The Unified State (Logix View)

Logix 看到的最终 State 结构如下：

```typescript
type FormState<T> = {
  values: T; // 对应 Data Store
  ui: UIState; // 对应 UI Store
}
```

## 3. Action Protocol (动作协议)

表单引擎定义了一组标准 Action，驱动所有表单行为。

```typescript
type FormAction =
  // --- Field Interactions ---
  | { type: 'field/change'; payload: { path: string; value: any } }
  | { type: 'field/blur'; payload: { path: string } }
  | { type: 'field/focus'; payload: { path: string } }

  // --- Form Lifecycle ---
  | { type: 'form/submit'; payload?: { trigger?: string } }
  | { type: 'form/reset'; payload?: { values?: any } }
  | { type: 'form/validate'; payload?: { paths?: string[] } }

  // --- System ---
  | { type: 'form/mount' }
  | { type: 'form/unmount' }
;
```

## 4. 路径系统 (Path System)

表单引擎沿用 Logix 的路径系统。

*   **Object**: `user.name`
*   **Array**: `items.0.price`

> **Note**: 在 React Layer，`useField('user.name')` 会自动订阅 `state.ui.fields['user.name']` 和 `state.values.user.name`，确保细粒度更新。
