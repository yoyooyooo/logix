# React API（@logixjs/form/react）

> **Status**: Aligned (010-form-api-perf-boundaries)
> **Layer**: React Bindings（thin wrapper on @logixjs/react）

React 层的职责很单一：把 `FormBlueprint` 投影成 hooks，并把 DOM 事件适配为 Form 的 module actions（`setValue/blur/array*`）。

实现落点：`packages/form/src/react/*`

## 1) `useForm(blueprint)`：拿到 controller + runtime

```ts
import { useForm } from "@logixjs/form/react"

const form = useForm(UserForm) // UserForm 是 Form.make(...) 的 Blueprint
// form.runtime：ModuleRuntime<FormState<...>, FormAction>
// form.controller：默认动作（validate/reset/handleSubmit/...）
```

## 2) `useField(form, valuePath)`：字段订阅与事件派发

实现落点：`packages/form/src/react/useField.ts`

返回值包含：

- `value`：订阅 `state[valuePath]`
- `touched/dirty`：订阅 `ui.<valuePath>` 的 `{ touched, dirty }`
- `error`：按优先级取 `errors.$manual` → `errors` → `errors.$schema`
- `onChange/onBlur`：派发 `setValue/blur`

> 关键点：数组字段的 UI 子树位于 `ui.<listPath>[i]...`，因此数组结构动作必须同步搬运 `ui.<listPath>`（见 `FormState` 文档与 `syncAuxArrays`）。

## 3) `useFieldArray(form, listPath)`：动态数组（fields + array actions）

实现落点：`packages/form/src/react/useFieldArray.ts`

- `fields[i].id`：根据 list 的 `trackBy` 与 rowIdStore 生成稳定 key
- `append/prepend/remove/swap/move`：派发 `array*` actions

## 4) `useFormState(form, selector)`：订阅聚合视图（FormView）

实现落点：`packages/form/src/react/useFormState.ts`

`FormView` 是对 `$form/errors/ui` 的聚合视图，用于 UI 层 O(1) 推导：

- `isValid/canSubmit/isDirty/isSubmitting/submitCount/...`

同时保证 selector 订阅的结果尽量稳定（减少无谓重渲染）。
