---
title: useDispatch
description: Get a typed dispatch function with batch and lowPriority helpers.
---

`useDispatch` returns a typed dispatch function for a module, plus helpers for common scheduling patterns.

## Basic usage

```tsx
import { useDispatch, useModule, useSelector } from '@logixjs/react'
import { CounterDef } from './modules/counter'

function Counter() {
  const counter = useModule(CounterDef)
  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: 'increment' })}>{count}</button>
}
```

## API

`useDispatch(handle)` returns a function object:

- `dispatch(action)`
- `dispatch.batch(actions)`
- `dispatch.lowPriority(action)` (more gentle UI notification merging; does not change correctness)

## See also

- [API: useModule](./use-module)
- [Guide: Tick / Flush](../../guide/essentials/tick-and-flush)
