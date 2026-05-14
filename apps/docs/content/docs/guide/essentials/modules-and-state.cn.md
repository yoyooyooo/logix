---
title: Modules and state
description: State schema、actions、reducers 与运行时写入。
---

Module 是持久 state 边界。它用 Effect Schema 声明 state，用 payload schema 声明 actions，也可以挂同步 reducer。

## State schema

```ts
const TodoState = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.String, done: Schema.Boolean })),
  filter: Schema.Literal("all", "open", "done"),
})
```

schema 是公开 state 形状。只要 TypeScript 能保留字面量，React selector 和 logic field path 都会围绕这个形状检查。

## Actions

```ts
const Todo = Logix.Module.make("Todo", {
  state: TodoState,
  actions: {
    added: Schema.Struct({ id: Schema.String, title: Schema.String }),
    toggled: Schema.String,
  },
})
```

Action 是进入 runtime 的输入，不是带隐藏 IO 的 command。IO 放进 logic 或 service。

## Reducers

```ts
reducers: {
  toggled: Logix.Module.Reducer.mutate((draft, action) => {
    const item = draft.items.find((row) => row.id === action.payload)
    if (item) item.done = !item.done
  }),
}
```

Reducer 是同步且纯的状态变换，运行在 transaction path 内。不要在 reducer 里做网络请求、timer 或 service 读取。

## Logic 写入

```ts
yield* $.state.update((prev) => ({ ...prev, filter: "open" }))
yield* $.state.mutate((draft) => { draft.filter = "done" })
```

当状态变化来自 watcher、service、source refresh 或长链路 workflow 时，用 logic 写入。

## 读取

logic 内通过 `$.state.read` 或只读 ref 读取。React 内通过 `useSelector(handle, selector)` 读取。
