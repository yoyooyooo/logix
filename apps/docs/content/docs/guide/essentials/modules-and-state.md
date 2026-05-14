---
title: Modules and state
description: State schemas, actions, reducers, and runtime writes.
---

A module is the durable state boundary. It declares state with Effect Schema, declares actions with payload schemas, and can attach synchronous reducers.

## State schema

```ts
const TodoState = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.String, done: Schema.Boolean })),
  filter: Schema.Literal("all", "open", "done"),
})
```

The schema is the public state shape. React selectors and logic field paths are checked against this shape where TypeScript can preserve literals.

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

Actions are inputs into the runtime. They are not commands with hidden IO. IO belongs in logic or services.

## Reducers

```ts
reducers: {
  toggled: Logix.Module.Reducer.mutate((draft, action) => {
    const item = draft.items.find((row) => row.id === action.payload)
    if (item) item.done = !item.done
  }),
}
```

Reducers are synchronous and pure. They run inside the transaction path. Avoid network calls, timers, and service reads inside reducers.

## Logic writes

```ts
yield* $.state.update((prev) => ({ ...prev, filter: "open" }))
yield* $.state.mutate((draft) => { draft.filter = "done" })
```

Use logic writes when the state transition is tied to a watcher, service, source refresh, or long-running workflow.

## Reads

Inside logic, read through `$.state.read` or a read-only ref. In React, read through `useSelector(handle, selector)`.
