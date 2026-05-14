---
title: useSelector
description: 从 Logix module handle 做精确 React 读取。
---

`useSelector(handle, selector, equalityFn?)` 订阅一个选中值。

## Field selectors

```tsx
const value = useSelector(handle, fieldValue("value"))
const [value, label] = useSelector(handle, fieldValues(["value", "label"]))
```

`fieldValue` 与 `fieldValues` 保留字段级意图，并对 literal paths 提供类型推导。

## Function selector

```tsx
const isEmpty = useSelector(handle, (state) => state.items.length === 0)
```

function selector 适合派生 UI 读取。返回对象且需要结构比较时，提供 `equalityFn`。

## Domain selectors

Form 暴露 `Form.Error.field(path)` 与 `Form.Companion.byRowId(...)` 这类 selector descriptor。它们仍然通过 `useSelector` 读取。
