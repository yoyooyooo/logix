# React API 设计 (React API Specification)

> **Status**: Definitive (v3.0 Perfected)
> **Layer**: React Bindings

## 1. `useField` (The Workhorse)

`useField` 负责将复杂的 Domain State 投影为简单的 UI Props。

```typescript
export interface UseFieldReturn<T> {
  // Data
  value: T;
  
  // UI Status
  isTouched: boolean;
  isDirty: boolean;
  isValidating: boolean;
  
  // Error Projection
  // Domain 层存储完整的 issues[]，但 UI 通常只需要显示第一个错误消息
  error?: string; 
  issues: FormIssue[]; // 高级场景可访问完整 issues
  
  // Handlers
  onChange: (value: T | React.ChangeEvent) => void;
  onBlur: () => void;
  onFocus: () => void;
}

function useField<T, P extends Path<T>>(
  control: Control<T>, 
  name: P
): UseFieldReturn<PathValue<T, P>> {
  // 1. Selector 订阅
  const fieldState = useSelector(control, state => ({
    value: get(state.values, name),
    meta: state.ui.fields[name] || DEFAULT_FIELD_META
  }));

  // 2. 派生 Error
  // 策略：取 severity 为 'error' 的第一条消息
  const firstError = useMemo(() => 
    fieldState.meta.issues.find(i => i.severity === 'error')?.message,
    [fieldState.meta.issues]
  );

  return {
    value: fieldState.value,
    isTouched: fieldState.meta.touched,
    // ...
    error: firstError,
    issues: fieldState.meta.issues,
    
    onChange: (val) => {
      // 自动处理 Event 对象
      const value = isEvent(val) ? val.target.value : val;
      control.dispatch({ type: 'field/change', payload: { path: name, value } });
    },
    // ...
  };
}
```

## 2. `useFieldArray` (The List Manager)

完全对齐 Domain 层的 Array Actions。

```typescript
export interface UseFieldArrayReturn<T> {
  fields: Array<{ id: string } & T>; // 自动注入 id 用于 key
  
  // Actions 映射到 Domain Action
  append: (value: T) => void;
  prepend: (value: T) => void;
  remove: (index: number) => void;
  swap: (indexA: number, indexB: number) => void;
  move: (from: number, to: number) => void;
  
  // 替换整个数组
  replace: (values: T[]) => void;
}

function useFieldArray<T, P extends ArrayPath<T>>(
  control: Control<T>,
  name: P
): UseFieldArrayReturn<ArrayItemType<T, P>> {
  // ... 实现略，核心是 dispatch({ type: 'array/*', ... })
}
```

## 3. 迁移指南 (Migration from PoC)

| 旧 PoC 概念 | 新 Logix Form 概念 | 说明 |
| :--- | :--- | :--- |
| `FormState` (Mixed) | `FormState` (Dual-Store) | `values` 分离，`errors` 升级为 `ui.fields[].issues` |
| `mode` / `reValidateMode` | `FormConfig` | 通过 Logic Preset 内部规则实现 |
| `arrayPush` (Method) | `array/append` (Action) | 方法调用变为 Action Dispatch |
| `Stream.runForEach` | `useSelector` | 手动订阅变为自动优化的 Selector |
| `SubscriptionRef` | `store.ref()` | `SubscriptionRef` 仍用于状态借用，通过 `store.ref()` API 获取 |