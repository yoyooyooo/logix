---
title: useDispatch
description: Get a typed dispatch function for a module handle.
---

`useDispatch` returns a typed dispatch function for a module handle.

## Usage

```tsx
import { useDispatch, useModule, useSelector } from "@logixjs/react"
import { Counter } from "./modules/counter"

function CounterView() {
  const counter = useModule(Counter.tag)
  const count = useSelector(counter, (s) => s.count)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: "increment" })}>{count}</button>
}
```

## Helpers

The returned function also exposes:

- `dispatch.batch(actions)`
- `dispatch.lowPriority(action)`

## See also

- [useModule](./use-module)
- [useSelector](./use-selector)
