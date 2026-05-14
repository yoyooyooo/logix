---
title: Handle
description: module instance 的只读与 dispatch-oriented view。
---

Handle 是 module instance 的安全公开视图。它暴露 read、change streams、dispatch 和 typed action helpers。

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

`useModule(...)` 返回 handle shape，加上 program 携带的领域扩展。`useSelector` 消费这个 handle。

## 边界

handle 不是 raw runtime internals object。它不应在 action/domain command 路线之外暴露直接 state mutation。
