---
title: useSelector
description: 订阅完整状态或状态切片。
---

`useSelector` 是 React 中读取 Logix 状态的 canonical API。

## 完整状态

```tsx
const state = useSelector(handle)
```

## 切片订阅

```tsx
const count = useSelector(handle, (s) => s.count)
```

也可以提供可选的 equality function：

```tsx
const slice = useSelector(handle, selector, equalityFn)
```

## 说明

- `useSelector(handle)` 读取完整状态
- `useSelector(handle, selector, equalityFn?)` 订阅状态切片
- 符合条件的 selector，在内部可能走更优化的订阅路径

## Form selector descriptors

Form-specific support reads 仍然使用这个 hook。

```tsx
const value = useSelector(form, fieldValue("items.0.warehouseId"))
const explain = useSelector(form, Form.Error.field("items.0.warehouseId"))
const support = useSelector(form, Form.Companion.field("items.warehouseId"))
const rowSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

`Form.Companion.*` descriptors 只通过 `useSelector` 消费。
它们不创建 `useCompanion`、Form-owned hook family、carrier-bound selector route 或第二条 host read route。

`Form.Error.field(path)` 是 field explanation selector。
它的结果可能表示 `error`、`pending`、`stale`、`cleanup`，也可能表示当前没有 explanation。
它不只等于 canonical `FormErrorLeaf`，也不会变成第二套 validation truth。

## 相关页面

- [useModule](./use-module)
- [useDispatch](./use-dispatch)
- [Form selectors and support facts](/cn/docs/form/selectors)
