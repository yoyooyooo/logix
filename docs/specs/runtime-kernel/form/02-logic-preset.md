# 预置逻辑 (Logic Preset)

> **Status**: Definitive (v2.1 Rule-Based Architecture)
> **Layer**: Form Domain

本文档描述 `makeForm` 内部预置的核心业务逻辑。这些逻辑利用 Kernel 的 `api.rule` DSL 实现。

## 1. 逻辑工厂 (Logic Factory)

```typescript
export const createFormLogic = <T>(config: FormConfig<T>) => 
  (api: LogicApi<FormState<T>, FormAction>) => [
    ...validationLogic(config, api),
    ...submissionLogic(config, api),
    ...interactionLogic(config, api),
  ];
```

## 2. 核心逻辑模块

### 2.1 交互逻辑 (Interaction Logic)

处理字段级别的基础交互。

*   **Auto Touch on Blur**:
    ```typescript
    api.rule({
      name: 'AutoTouch',
      trigger: api.on.action('field/blur'),
      do: api.ops.set(s => s.ui.fields[ctx.payload.path].touched, true)
    })
    ```

*   **Dirty Check**:
    ```typescript
    // 监听 values 的任何变化
    api.rule({
      name: 'DirtyCheck',
      trigger: api.on.change(s => s.values),
      do: api.ops.compute((ctx) => {
        const isDirty = !deepEqual(ctx.value, config.initialData);
        return api.ops.set(s => s.ui.meta.isDirty, isDirty);
      })
    })
    ```

### 2.2 校验逻辑 (Validation Logic)

处理同步与异步校验。

*   **Trigger Strategy**:
    *   `api.on.action('field/change')`: 触发字段级校验 (可配置防抖)。
    *   `api.on.action('field/blur')`: 触发字段级校验 (立即)。
    *   `api.on.action('form/validate')`: 触发指定字段或全量校验。

*   **Execution Flow**:
    1.  设置 `ui.fields[path].validating = true`。
    2.  调用 Schema 校验。
    3.  更新 `ui.fields[path].issues` 和 `ui.meta.isValid`。
    4.  设置 `ui.fields[path].validating = false`。

### 2.3 提交流程 (Submission Logic)

管理提交生命周期。

*   **Trigger**: `api.on.action('form/submit')`
*   **Execution Flow**:
    1.  设置 `ui.meta.isSubmitting = true`，`ui.meta.submitCount++`。
    2.  派发 `form/validate` 进行全量校验。
    3.  等待校验完成 (监听 `ui.meta.isValidating` 变为 false)。
    4.  **Check**: 如果 `ui.meta.isValid` 为 false，终止提交，聚焦第一个错误字段。
    5.  **Execute**: 调用用户传入的 `onSubmit(values)` Effect。
    6.  **Finalize**: 设置 `ui.meta.isSubmitting = false`。

### 2.4 重置逻辑 (Reset Logic)

*   **Trigger**: `api.on.action('form/reset')`
*   **Action**: 
    *   将 `values` 重置为 `initialData`。
    *   重置所有 `ui.fields` 状态 (touched, dirty, issues)。
    *   重置 `ui.meta`。
