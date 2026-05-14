---
title: Modules & State
description: Define state and actions, then assemble them into Programs.
---

A Module declares state and actions. A Program chooses initial state, mounted logic, services, imports, and transaction options.

```ts
const Counter = Logix.Module.make("Counter", {
  state: Schema.Struct({ value: Schema.Number }),
  actions: { inc: Schema.Void },
})

const CounterProgram = Logix.Program.make(Counter, {
  initial: { value: 0 },
})
```

## State writes

In logic, use the Bound API:

```ts
const Logic = Counter.logic("counter-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("inc").mutate((state) => {
      state.value += 1
    })
  }),
)
```

In React, writes usually go through `useDispatch(...)` or a domain handle such as a Form handle.

## Reads

In React:

```tsx
const counter = useModule(Counter.tag)
const value = useSelector(counter, (state) => state.value)
```

Do not use raw Module objects in React acquisition. Use `Module.tag` for hosted instances or `Program` for local/keyed instances.
