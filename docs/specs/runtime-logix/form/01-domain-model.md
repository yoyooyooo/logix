# 领域模型 (Domain Model)

> **Status**: Definitive (v3.0 Perfected)
> **Layer**: Form Domain

本文档定义表单引擎在 Logix 之上的数据结构映射与 Action 协议。采用 **Dual-Store (双存储)** 模式以分离业务价值与交互状态。

## 1. 状态架构 (State Architecture)

### 1.1 Data Store (The Truth)
仅存储纯净的、可序列化的业务数据。支持 Time-Travel 和持久化。

```typescript
type DataState<T> = T;
```

### 1.2 UI Store (The Machinery)
存储所有瞬态交互状态。

```typescript
// 标准化问题模型
export interface FormIssue {
  code: string;       // 错误码 (e.g., "required", "min_length")
  message: string;    // 错误消息
  severity: 'error' | 'warning' | 'info';
  path: string;       // 触发路径
}

export interface FieldState {
  touched: boolean;
  dirty: boolean;
  validating: boolean;
  focused: boolean;   // 新增：焦点状态追踪
  issues: FormIssue[];
}

export interface UIState {
  // 字段元数据 (Key 为扁平化 Path)
  fields: Record<string, FieldState>;

  // 全局元数据
  meta: {
    isValid: boolean;
    isSubmitting: boolean;
    isValidating: boolean;
    isDirty: boolean;
    submitCount: number;
    // 聚合所有字段的错误，便于全局展示
    allIssues: FormIssue[]; 
  };
}
```

### 1.3 The Unified State

```typescript
type FormState<T> = {
  values: T;
  ui: UIState;
}
```

## 2. Action Protocol (动作协议)

所有表单行为必须通过以下 Action 触发，严禁直接修改 State。

```typescript
type FormAction =
  // --- Field Interactions ---
  | { type: 'field/change'; payload: { path: string; value: any } }
  | { type: 'field/blur'; payload: { path: string } }
  | { type: 'field/focus'; payload: { path: string } }

  // --- Array Operations (First-Class Citizens) ---
  // 显式定义数组操作，以便 DevTools 记录和 Rules 拦截
  | { type: 'array/append'; payload: { path: string; value: any } }
  | { type: 'array/prepend'; payload: { path: string; value: any } }
  | { type: 'array/remove'; payload: { path: string; index: number } }
  | { type: 'array/swap'; payload: { path: string; indexA: number; indexB: number } }
  | { type: 'array/move'; payload: { path: string; from: number; to: number } }

  // --- Form Lifecycle ---
  | { type: 'form/submit'; payload?: { trigger?: string } }
  | { type: 'form/reset'; payload?: { values?: any } }
  | { type: 'form/validate'; payload?: { paths?: string[] } }
  | { type: 'form/setValues'; payload: { values: any } } // 批量更新
;
```