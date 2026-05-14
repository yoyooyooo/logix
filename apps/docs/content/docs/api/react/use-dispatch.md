---
title: useDispatch
description: Get a typed dispatch function for a module handle.
---

`useDispatch(handle)` returns a dispatch function for an acquired module instance.

```tsx
function CounterButton() {
  const counter = useModule(Counter.tag)
  const value = useSelector(counter, (state) => state.value)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: "inc", payload: undefined })}>{value}</button>
}
```

The returned function also exposes:

```ts
dispatch.batch(actions)
dispatch.lowPriority(action)
```

For Form, prefer the form handle methods such as `form.field(path).set(...)`, `form.fieldArray(path).append(...)`, and `form.submit()` when they express the domain operation directly.

## See also

- [useModule](./use-module)
- [useSelector](./use-selector)
