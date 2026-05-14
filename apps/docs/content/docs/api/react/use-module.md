---
title: useModule
description: Acquire a shared module instance or a local/keyed program instance.
---

`useModule` has two public routes.

## Shared hosted instance

```tsx
const counter = useModule(Counter.tag)
```

Use a tag when the current runtime already hosts the module through the root program or imports.

## Local/keyed program instance

```tsx
const preview = useModule(PreviewProgram, { key: productId })
```

Use a program when the component or route should own an instance. `key` enables reuse across components under the same provider.

## Suspense

```tsx
const preview = useModule(PreviewProgram, {
  key: productId,
  suspend: true,
  initTimeoutMs: 3000,
})
```

Suspense affects acquisition fallback only; it does not change runtime semantics.

## Reads and writes

Use `useSelector(handle, selector)` for reads and `useDispatch(handle)` or domain handle commands for writes.
