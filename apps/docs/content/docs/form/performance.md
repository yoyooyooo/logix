---
title: Performance
description: Keep form reads narrow and validation scoped.
---

## Prefer core selectors

Use `useSelector(form, selector)` to subscribe to the smallest slice you actually render.

```tsx
const canSubmit = useSelector(
  form,
  (s) => s.$form.errorCount === 0 && !s.$form.isSubmitting,
)

const submitCount = useSelector(form, (s) => s.$form.submitCount)
const lineItem = useSelector(form, (s) => s.items[index])
```

Avoid reading the whole form state if the component only needs one flag or one row.
When a page renders multiple local instances, do not use a shared instance just to reduce instance creation. Instance isolation takes priority.

## Prefer scoped validation

```ts
yield* form.validatePaths(["shipping.address"])
```

Use `validatePaths(...)` when only one field or one subtree changed and you do not need a full-form pass.

## Treat arrays as structural hot paths

Use `form.fieldArray(path)` for list edits:

- `insert`
- `update`
- `replace`
- `remove`
- `swap`
- `move`
- `byRowId(...)`

This keeps structural edits aligned with row ownership and cleanup semantics.

For identity configuration:

- prefer `trackBy` when rows already have a stable business id
- use `store` when rows are client-created but still need stable structural editing
- avoid `index` for reorder-heavy flows

## Control restore cost

A keyed instance with `gcTime` can restore existing state after route changes.
Restoring should not force whole-form subscriptions; the cost mainly comes from which slices remounted components read.

```tsx
const form = useModule(CheckoutForm, {
  key: `checkout:${cartId}`,
  gcTime: 60_000,
})
```

For complex forms:

- use `useModule(Form.tag)` for route-level shared state
- use `useModule(Form, { key, gcTime })` for restorable page editor sessions
- use `useModule(Form)` or different keys for multiple independent copies on the same screen

## Keep error rendering data-first

Render from canonical error leaves plus the current i18n snapshot.
Do not convert validation output into ad-hoc display strings deep inside the validation layer.

## See also

- [Instances](/docs/form/instances)
- [Field arrays](/docs/form/field-arrays)
- [Selectors and support facts](/docs/form/selectors)
