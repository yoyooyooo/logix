---
title: useDispatch
description: Dispatch actions from React into a module instance.
---

`useDispatch(handle)` returns the module dispatch function.

```tsx
const dispatch = useDispatch(counter)

dispatch({ _tag: "increment", payload: undefined })
dispatch({ _tag: "rename", payload: { id, name } })
```

Dispatch sends an action into the runtime. Reducers and logic decide how state changes.

## Domain commands

Domain handles may expose commands that are clearer than raw dispatch.

```tsx
await Effect.runPromise(form.field("email").set(value))
await Effect.runPromise(form.submit())
```

Use those commands when they are part of the domain contract.
