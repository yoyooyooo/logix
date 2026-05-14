---
title: useSelector
description: 订阅精确 state selector 或 selector descriptor。
---

`useSelector(handle, selector, equalityFn?)` 是 canonical React read API。

```tsx
const counter = useModule(Counter.tag)
const value = useSelector(counter, (state) => state.value)
```

无参数 full-state 读取不是当前公开路线。必须传入显式 selector。

## Equality

```tsx
const summary = useSelector(
  counter,
  (state) => ({ value: state.value, doubled: state.value * 2 }),
  (a, b) => a.value === b.value && a.doubled === b.doubled,
)
```

如果不传 equality function，Logix 会优先使用 selector descriptor 自带 equality，否则使用 `Object.is`。

## Form selectors

Form-specific reads 仍然走这个 hook：

```tsx
const name = useSelector(form, fieldValue("name"))
const values = useSelector(form, fieldValues(["name", "email"]))
const meta = useSelector(form, rawFormMeta())
const error = useSelector(form, Form.Error.field("name"))
const companion = useSelector(form, Form.Companion.field("warehouseId"))
const rowCompanion = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

Form 不新增 `useForm`、`useField`、`useFieldValue` 或 `useCompanion` 作为 canonical read routes。

## Selector precision

优先使用 exact selectors 与 descriptor helpers。宽函数 selector 只在确有需要时使用；精确读取能让 runtime 更精准地路由通知。

## See also

- [useModule](./use-module)
- [Form selectors](/cn/docs/form/selectors)
