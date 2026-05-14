---
title: useSelector
description: Precise React reads from a Logix module handle.
---

`useSelector(handle, selector, equalityFn?)` subscribes to a selected value.

## Field selectors

```tsx
const value = useSelector(handle, fieldValue("value"))
const [value, label] = useSelector(handle, fieldValues(["value", "label"]))
```

`fieldValue` and `fieldValues` preserve field-level intent and type inference for literal paths.

## Function selector

```tsx
const isEmpty = useSelector(handle, (state) => state.items.length === 0)
```

Function selectors are useful for derived UI reads. Provide `equalityFn` for object results that should be compared structurally.

## Domain selectors

Form exposes selector descriptors such as `Form.Error.field(path)` and `Form.Companion.byRowId(...)`. They still go through `useSelector`.
