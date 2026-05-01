---
title: useSelector
description: Subscribe to full module state or a selected slice.
---

`useSelector` is the canonical read API for Logix state in React.

## Full state

```tsx
const state = useSelector(handle)
```

## Slice subscription

```tsx
const count = useSelector(handle, (s) => s.count)
```

An optional equality function may be provided:

```tsx
const slice = useSelector(handle, selector, equalityFn)
```

## Notes

- `useSelector(handle)` reads full state
- `useSelector(handle, selector, equalityFn?)` subscribes to a slice
- eligible selectors may use a more optimized subscription path internally

## Form selector descriptors

Form-specific support reads still use this hook.

```tsx
const value = useSelector(form, fieldValue("items.0.warehouseId"))
const explain = useSelector(form, Form.Error.field("items.0.warehouseId"))
const support = useSelector(form, Form.Companion.field("items.warehouseId"))
const rowSupport = useSelector(
  form,
  Form.Companion.byRowId("items", rowId, "warehouseId"),
)
```

`Form.Companion.*` descriptors are consumed through `useSelector`.
They do not create `useCompanion`, a Form-owned hook family, a carrier-bound selector route, or a second host read route.

`Form.Error.field(path)` is a field explanation selector.
Its result may represent `error`, `pending`, `stale`, `cleanup`, or no current explanation.
It is not just the canonical `FormErrorLeaf`, and it does not become a second validation truth.

## See also

- [useModule](./use-module)
- [useDispatch](./use-dispatch)
- [Form selectors and support facts](/docs/form/selectors)
