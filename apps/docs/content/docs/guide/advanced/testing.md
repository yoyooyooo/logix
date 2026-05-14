---
title: Testing
description: Test modules, programs, runtime runs, and React projection at the right boundary.
---

Test the same boundary that owns the behavior.

## Reducers and pure helpers

Test synchronous transforms directly.

## Runtime behavior

Use `Runtime.run` for module logic, services, imports, and transaction behavior.

```ts
await Logix.Runtime.run(Program, ({ module }) =>
  Effect.gen(function* () {
    yield* module.dispatch({ _tag: "increment", payload: undefined })
    const state = yield* module.getState
    expect(state.count).toBe(1)
  }),
)
```

## Static checks

```ts
const report = await Effect.runPromise(Logix.Runtime.check(Program))
expect(report.verdict).toBe("PASS")
```

## React tests

React tests should assert projection: provider wiring, instance ownership, selector updates, and UI behavior. Do not re-test runtime internals through the DOM.
