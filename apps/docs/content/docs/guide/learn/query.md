---
title: Query
description: Build query programs through `@logixjs/query`, then inject cache and dedup engines explicitly.
---

`@logixjs/query` is a program-first resource kit.

It packages:

- query params
- query UI state
- resource snapshots

into module state, so the whole query chain stays subscribable, debuggable, and replayable.

## Minimal usage

```ts
export const SearchQuery = Query.make("SearchQuery", {
  params: Schema.Struct({ q: Schema.String }),
  initialParams: { q: "" },
  ui: { query: { autoEnabled: true } },
  queries: ($) => ({
    list: $.source({
      resource: SearchSpec,
      deps: ["params.q", "ui.query.autoEnabled"],
      triggers: ["onMount", "onKeyChange"],
      concurrency: "switch",
      key: (q, autoEnabled) => (autoEnabled && q ? { q } : undefined),
    }),
  }),
})
```

## Engine injection

External cache or dedup engines are injected explicitly:

```ts
const runtime = Logix.Runtime.make(RootProgram, {
  layer: Layer.mergeAll(AppInfraLayer, Query.Engine.layer(Query.TanStack.engine(new QueryClient()))),
  middleware: [Query.Engine.middleware()],
})
```

## Owner model

- Query defines the query program
- the external engine remains optional and explicit
- params, UI state, and snapshots remain in module state

## Common usage

- use imported query modules like ordinary child programs
- let the owning module drive param changes or refresh
- keep query orchestration explicit

## See also

- [Cross-module communication](./cross-module-communication)
