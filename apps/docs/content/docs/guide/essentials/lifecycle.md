---
title: Lifecycle
description: Keep startup readiness, runtime ownership, and React projection separate.
---

Lifecycle has three distinct areas:

| Area | Owner |
| --- | --- |
| startup readiness | `$.readyAfter(...)` inside `Module.logic(...)` declaration phase |
| runtime ownership/disposal | the boundary that calls `Runtime.make(...)` or `Runtime.run(...)` |
| React visibility | `RuntimeProvider` and `useModule(...)` |

## Readiness

```ts
const Logic = Module.logic("startup", ($) => {
  $.readyAfter(loadRequiredConfig, { id: "required-config" })

  return Effect.gen(function* () {
    // long-running run phase
  })
})
```

`readyAfter` gates readiness. The returned run effect is not readiness work.

## React local lifetime

Use `useModule(Program, options)` for component/route-owned instances:

```tsx
const session = useModule(SessionProgram, {
  key: `session:${id}`,
  gcTime: 60_000,
})
```

`RuntimeProvider` makes a runtime visible. It does not automatically dispose shared runtimes.
