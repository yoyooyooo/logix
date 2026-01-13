---
title: useSelector
description: Subscribe to module state slices with optional equality and ReadQuery-based optimization.
---

`useSelector` is the primary Hook for **reading module state** in React.

It subscribes your component to a module’s state (or a selected slice), and re-renders only when the selected value changes.

## Basic usage

```tsx
import { useModule, useSelector } from '@logixjs/react'
import { CounterDef } from './modules/counter'

function Counter() {
  const counter = useModule(CounterDef)
  const count = useSelector(counter, (s) => s.count)

  return <div>{count}</div>
}
```

## API

### 1) `useSelector(handle)` (read full state)

Returns the full state of the module.

### 2) `useSelector(handle, selector, equalityFn?)` (read a slice)

- `selector`: `(state) => slice`
- `equalityFn`: optional equality function; controls when the component should re-render

When eligible, Logix may compile the selector into a `ReadQuery` to enable a more optimized subscription path.

## See also

- [API: useModule](./use-module)
- [API: useDispatch](./use-dispatch)
- [API: ReadQuery](../core/read-query)
