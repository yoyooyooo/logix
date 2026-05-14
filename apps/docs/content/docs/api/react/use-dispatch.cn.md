---
title: useDispatch
description: 从 React 向 module instance 派发 actions。
---

`useDispatch(handle)` 返回 module dispatch function。

```tsx
const dispatch = useDispatch(counter)

dispatch({ _tag: "increment", payload: undefined })
dispatch({ _tag: "rename", payload: { id, name } })
```

Dispatch 把 action 送入 runtime。state 如何变化由 reducer 和 logic 决定。

## Domain commands

领域 handle 可能暴露比 raw dispatch 更清晰的 command。

```tsx
await Effect.runPromise(form.field("email").set(value))
await Effect.runPromise(form.submit())
```

当这些 command 属于领域契约时，优先使用它们。
