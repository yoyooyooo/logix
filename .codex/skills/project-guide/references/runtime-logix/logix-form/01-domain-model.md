# Form Domain Model（State / Actions / Paths）

> **Status**: Aligned (010-form-api-perf-boundaries)
> **Layer**: Form Core（@logix/form）

本文档用于固化 `@logix/form` 的“工程内裁决口径”：Form 的状态形状、错误树分层、数组 `$list/rows[]` 映射，以及用于 reducer/hook/controller 的 action 协议。

## 1) FormState：values + errors/ui/$form（同一 Module 状态）

`@logix/form` 不引入第二套 Store：**表单就是一个 Module**，state 直接挂在 runtime 上。

```ts
// packages/form/src/form.ts
export type FormState<TValues extends object> = TValues & {
  readonly errors: unknown
  readonly ui: unknown
  readonly $form: {
    readonly submitCount: number
    readonly isSubmitting: boolean
    readonly isDirty: boolean
    readonly errorCount: number
  }
}
```

### 1.1 values（业务真相）

- `TValues` 直接平铺在 state root（`config.values` 决定结构）
- 表单逻辑/校验/派生都围绕这份 values 工作

### 1.2 ui（交互态树）

- `ui.<valuePath>` 存字段交互态：`{ touched?: boolean; dirty?: boolean }`
- **数组字段**会形成 `ui.<listPath>` 的“行级子树数组”：
  - 例如 `items.0.name` 的交互态实际挂在 `ui.items[0].name`
  - 因此数组结构动作（append/remove/move/swap）必须同步搬运 `ui.<listPath>`，避免“行错位”（见 `syncAuxArrays`）

### 1.3 errors（统一错误树 + 分层）

错误树是唯一真相源，且分成三层：

- **规则层（Rules）**：`errors.<valuePath>`（数组字段走 `rows` 映射）
- **手动层（Manual）**：`errors.$manual.<valuePath>`（读取优先级最高）
- **Schema 层（Schema）**：`errors.$schema.<valuePath>`（默认仅 submit/manual decode）

读取优先级（hook 层）：`manual ?? rules ?? schema`。

### 1.4 $form（O(1) 元信息）

- `submitCount`：驱动 validateOn/reValidateOn 的“两阶段”语义
- `isSubmitting`：`handleSubmit` 的语义开关（保证 finally 复位）
- `isDirty`：任意非 aux path 的 setValue/array\* 写入后置 true
- `errorCount`：错误树叶子计数（不含 `$rowId`），用于 O(1) 推导 `isValid/canSubmit`

## 2) Path 映射：数组统一 `$list/rows[]`

`@logix/form` 把“数组索引”映射到 errors 的 `rows`：

- valuePath：`items.0.name`
- errorsPath：`errors.items.rows.0.name`

对应函数落点：`packages/form/src/path.ts`（`toErrorsPath/toManualErrorsPath/toSchemaErrorsPath/toUiPath`）。

## 3) Action 协议（Module actions）

Form 的 Module actions 是实现细节，但会被 React hooks 与 controller 调用（通过 `dispatch` 派发）。

实现落点：`packages/form/src/form.ts`（`FormActions`）。

核心动作（概念分组）：

- 字段：`setValue` / `blur`
- 数组：`arrayAppend` / `arrayPrepend` / `arrayRemove` / `arraySwap` / `arrayMove`
- 错误：`setError` / `clearErrors` / `reset`
- 提交：`submit` / `submitAttempt` / `setSubmitting`

## 4) “Form reducers” vs “Module reducers”

没有两套 reducer：

- “Form reducers”只是 **Form 这个 Module 的 reducers**（`Form.make(...).module` 的 reducers 实现）
- 与业务自建的 Module reducers 是同一机制：`(state, action) => nextState`

差异仅在于：Form reducers 会显式标注 patchPaths（见 `reducers(state, action, sink)` 的第三参），用来守住高频输入/动态列表下的性能边界。
