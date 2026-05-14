---
title: Suspense and async ownership
description: Async readiness, local program instances, and React fallback boundaries.
---

Async work has two routes: readiness work that gates acquisition, and running work that updates state after the instance is ready.

## Readiness gate

```ts
yield* $.readyAfter(loadConfig, { id: "config" })
```

Use this only when the instance is not meaningful without the result.

## Suspense acquisition

```tsx
const module = useModule(Program, {
  key: "preview",
  suspend: true,
  initTimeoutMs: 3000,
})
```

Suspense controls React fallback while the local instance initializes. It does not change module semantics.

## Interaction loading

For search, submit, and background refresh, put loading state in the module or domain program. Do not suspend the entire route for every interaction.
