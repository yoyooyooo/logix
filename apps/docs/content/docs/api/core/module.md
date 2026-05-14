---
title: Module
description: Definition-time state, actions, reducers, and logic builder.
---

`Module` is the definition object. It owns the state schema, action schema, optional synchronous reducers, and the `logic` builder.

## `Module.make`

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: { increment: Schema.Void },
  reducers: {
    increment: Logix.Module.Reducer.mutate((draft) => {
      draft.count += 1
    }),
  },
})
```

| Field | Meaning |
| --- | --- |
| `state` | Effect Schema for the module state. |
| `actions` | action tag to payload schema map. |
| `reducers` | synchronous action reducers. |
| `services`, `schemas`, `meta`, `dev` | metadata and integration support. |

## `module.logic(id, build, options?)`

```ts
const logic = Counter.logic("counter-logic", ($) => Effect.void)
```

`id` is required. The builder receives the Bound API `$`. It returns the runtime effect for the module instance.

## Reducer helper

`Module.Reducer.mutate(fn)` lets reducers write through a draft while preserving transaction semantics.

## Boundary

`Module` is not the assembly unit. Use `Program.make(Module, config)` to provide initial state, logic units, imports, and services.
