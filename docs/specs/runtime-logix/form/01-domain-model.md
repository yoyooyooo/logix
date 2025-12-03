# 状态与动作模型 (Form State & Actions)

> **Status**: Definitive (v3.0, aligned with logix-core)
> **Layer**: Form Core

本文档只做一件事：在 `logix-core` 的 `ModuleShape` 之上，给表单库定义一份标准化的 State/Action 形状（FormShape），作为所有 Form 模块的公共契约。

## 1. 状态架构 (State Architecture)

### 1.1 Data State (The Truth)

仅存储纯净的、可序列化的业务数据，支持 Time-Travel 和持久化。

```typescript
type DataState<T> = T;
```

### 1.2 UI State (The Machinery)

存储所有瞬态交互状态，专门为表单 UI 服务。

```typescript
// 标准化问题模型
export interface FormIssue {
  code: string;       // 错误码 (e.g., "required", "min_length")
  message: string;    // 错误消息
  severity: "error" | "warning" | "info";
  path: string;       // 触发路径（扁平 Path）
}

export interface FieldState {
  touched: boolean;
  dirty: boolean;
  validating: boolean;
  focused: boolean;
  issues: FormIssue[];
}

export interface UIState {
  // 字段元数据 (Key 为扁平化 Path)
  fields: Record<string, FieldState>;

  // 全局元数据（全部可以由 values + fields 派生，但这里标准化一份形状）
  meta: {
    isValid: boolean;
    isSubmitting: boolean;
    isValidating: boolean;
    isDirty: boolean;
    submitCount: number;
    allIssues: FormIssue[]; 
  };
}
```

### 1.3 Unified Form State

```typescript
export interface FormState<T> {
  values: T;
  ui: UIState;
}
```

Form 模块的 `stateSchema` 应该以 `FormState<T>` 为基础，通过 `effect/Schema` 进行建模。

## 2. Action 形状 (Action Shape)

logix-core 已经约定了 Action 使用 `_tag` + `payload` 的 Union 模式，Form 直接沿用这一约定。

```typescript
export type FormAction =
  // --- Field Interactions ---
  | { _tag: "field/change"; payload: { path: string; value: unknown } }
  | { _tag: "field/blur"; payload: { path: string } }
  | { _tag: "field/focus"; payload: { path: string } }

  // --- Array Operations (First-Class Citizens) ---
  | { _tag: "array/append"; payload: { path: string; value: unknown } }
  | { _tag: "array/prepend"; payload: { path: string; value: unknown } }
  | { _tag: "array/remove"; payload: { path: string; index: number } }
  | {
      _tag: "array/swap";
      payload: { path: string; indexA: number; indexB: number };
    }
  | {
      _tag: "array/move";
      payload: { path: string; from: number; to: number };
    }

  // --- Form Lifecycle ---
  | { _tag: "form/submit"; payload?: { trigger?: string } }
  | { _tag: "form/reset"; payload?: { values?: unknown } }
  | { _tag: "form/validate"; payload?: { paths?: string[] } }
  | { _tag: "form/setValues"; payload: { values: unknown } };
```

所有 Form Logic 都应基于 `FormAction` 进行 `fromAction(a => a._tag === "…")` 的筛选，不再混用 `type`/`kind` 等字段名。
