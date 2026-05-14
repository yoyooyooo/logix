---
title: useSelector
description: Subscribe to a precise state selector or selector descriptor.
---

`useSelector(handle, selector, equalityFn?)` is the canonical React read API.

```tsx
const counter = useModule(Counter.tag)
const value = useSelector(counter, (state) => state.value)
```

No-argument full-state reads are not part of the current public route. Pass an explicit selector.

## Equality

```tsx
const summary = useSelector(
  counter,
  (state) => ({ value: state.value, doubled: state.value * 2 }),
  (a, b) => a.value === b.value && a.doubled === b.doubled,
)
```

If you do not pass an equality function, Logix uses the selector descriptor's equality when available, otherwise `Object.is`.

## Form selectors

Form-specific reads still go through this hook:

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

Form does not add `useForm`, `useField`, `useFieldValue`, or `useCompanion` as canonical read routes.

## Selector precision

Prefer exact selectors and descriptor helpers. Broad function selectors are allowed only when you really need them, but exact reads give the runtime more room to route notifications precisely.

## See also

- [useModule](./use-module)
- [Form selectors](/docs/form/selectors)
