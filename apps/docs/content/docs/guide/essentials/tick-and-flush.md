---
title: Tick and flush
description: How runtime commits, selector notifications, and React rendering relate.
---

A user interaction enters the runtime as an action or state write. The runtime batches work into a transaction window, commits the state, then notifies precise readers.

## Timeline

```text
dispatch action
  -> reducer / logic write
  -> state transaction
  -> field/source convergence
  -> commit
  -> selector notification
  -> React render
```

The exact internal phases can change for performance, but the public contract is stable: writes are transactional and React reads subscribe through selectors.

## Selector precision

`fieldValue(path)` and `fieldValues(paths)` give the runtime a stable field-level read. Selector functions are allowed, but broad selectors may need more work to prove precision.

## Batch route

Use `Runtime.batch` to group synchronous host work when needed.

```ts
Logix.Runtime.batch(() => {
  dispatch({ _tag: "a", payload: undefined })
  dispatch({ _tag: "b", payload: undefined })
})
```

Use runtime batching sparingly. Prefer modeling durable transitions as actions and reducers.
