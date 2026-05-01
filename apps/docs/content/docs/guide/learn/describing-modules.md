---
title: Describing modules
description: Define modules, attach logic, and assemble programs through one canonical route.
---

Logix describes business units through three objects:

- `Module`
- `Logic`
- `Program`

## Module

`Module` defines:

- state schema
- action schema
- logic attachment points

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ count: Schema.Number }),
  actions: {
    increment: Schema.Void,
    decrement: Schema.Void,
  },
})
```

## Logic

`Logic` defines reactions, watchers, and declaration-time assets.

```ts
const CounterLogic = Counter.logic("counter-logic", ($) => {
  $.reducer("increment", (state) => ({ ...state, count: state.count + 1 }))
  return Effect.void
})
```

## Program

`Program` assembles one executable business unit:

```ts
const CounterProgram = Logix.Program.make(Counter, {
  initial: { count: 0 },
  logics: [CounterLogic],
})
```

## Roles

- `Module` defines
- `Logic` declares and reacts
- `Program` assembles
- `Runtime` executes

## Notes

- `Program.make(...)` is the canonical assembly route
- Lower-level implementation objects are not part of the canonical authoring path
- React host consumption stays on `useModule(...)` and `useSelector(...)`

## See also

- [Modules & State](../essentials/modules-and-state)
- [Runtime](../../api/core/runtime)
