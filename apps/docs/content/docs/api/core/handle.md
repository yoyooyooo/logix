---
title: Handle
description: Read-only and dispatch-oriented view of a module instance.
---

A handle is the safe public view of a module instance. It exposes reads, change streams, dispatch, and typed action helpers.

## Shape

```ts
handle.read((state) => state.value)
handle.changes((state) => state.value)
handle.dispatch({ _tag: "refresh", payload: undefined })
handle.actions.refresh()
```

## Imported child handle

```ts
const child = yield* $.use(Child.tag)
yield* child.actions.refresh()
const value = yield* child.read((state) => state.value)
```

## React handle

`useModule(...)` returns the handle shape plus domain extensions carried by the program. `useSelector` consumes that handle.

## Boundary

A handle is not a raw runtime internals object. It should not expose direct state mutation outside the sanctioned action/domain command routes.
