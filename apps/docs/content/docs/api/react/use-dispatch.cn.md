---
title: useDispatch
description: 为 module handle 获取 typed dispatch function。
---

`useDispatch(handle)` 为已获取的 module instance 返回 dispatch function。

```tsx
function CounterButton() {
  const counter = useModule(Counter.tag)
  const value = useSelector(counter, (state) => state.value)
  const dispatch = useDispatch(counter)

  return <button onClick={() => dispatch({ _tag: "inc", payload: undefined })}>{value}</button>
}
```

返回的函数还提供：

```ts
dispatch.batch(actions)
dispatch.lowPriority(action)
```

对于 Form，优先使用 form handle methods，例如 `form.field(path).set(...)`、`form.fieldArray(path).append(...)`、`form.submit()`，因为它们能直接表达领域操作。

## See also

- [useModule](./use-module)
- [useSelector](./use-selector)
