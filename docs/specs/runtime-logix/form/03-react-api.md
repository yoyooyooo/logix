# React API 设计 (React API Specification)

> **Status**: Draft (focus on DOM/focus integration)  
> **Layer**: React Bindings

React 层只做一件事：把 `ModuleRuntime<FormState<T>, FormAction>` 投影成组件可用的 Hook 返回值，并处理 DOM 事件细节。

## 1. `useForm`（入口 Hook）

轻量包装 ModuleRuntime / ModuleInstance，统一返回 Form 控制器。

```typescript
export interface FormController<TValues> {
  readonly runtime: Logix.ModuleRuntime<FormState<TValues>, FormAction>;
  readonly getState: () => FormState<TValues>;
  readonly dispatch: (action: FormAction) => void;
}
```

具体 `useForm` 形状可以根据 `logix-react` 的最终 API 细化，这里不强行定死细节。

## 2. `useField` (The Workhorse)

`useField` 负责将复杂的 FormState 投影为简单的 UI Props，并处理 `onChange/onBlur/onFocus` 到 FormAction 的映射。

```typescript
export interface UseFieldReturn<T> {
  value: T;
  isTouched: boolean;
  isDirty: boolean;
  isValidating: boolean;
  error?: string;
  issues: FormIssue[];
  onChange: (value: T | React.ChangeEvent<any>) => void;
  onBlur: () => void;
  onFocus: () => void;
}
```

推荐实现思路：

- 使用 `useSelector(runtime, s => {...})` 做细粒度订阅；
- 错误投影：从 `fieldState.issues` 中取第一条 `severity === "error"` 的 message 作为 `error`；
- 事件适配：`onChange` 接受值或 `ChangeEvent`，统一封装成 `_tag: "field/change"`；`onBlur`/`onFocus` 则派发对应 Action。

## 3. `useFieldArray` (The List Manager)

完全对齐 Domain 层的 Array Actions，不额外引入状态。

```typescript
export interface UseFieldArrayReturn<TItem> {
  fields: Array<{ id: string } & TItem>;
  append: (value: TItem) => void;
  prepend: (value: TItem) => void;
  remove: (index: number) => void;
  swap: (indexA: number, indexB: number) => void;
  move: (from: number, to: number) => void;
  replace: (values: TItem[]) => void;
}
```

`fields` 的 `id` 由 Hook 内部维护（例如 `useId` + 本地 Ref），只用于 React `key`，不写回 `values`。

## 4. 迁移指南 (Migration from PoC)

- 统一依赖 logix-core 的 `ModuleRuntime`/`ModuleShape`，不再自建 Store 类型。
- 表单错误统一来源于 `ui.fields[path].issues` 与 `ui.meta.allIssues`，React 层不再维护平行的 `errors` 状态。
- 所有副作用（异步校验、防抖、竞态）放在 Logic 预置中，React Hook 只做订阅 + DOM 事件适配。
