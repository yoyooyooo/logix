---
title: Query
description: Build replayable query modules with @logix/query, and optionally plug in cache/dedup engines.
---

# Query

`@logix/query` turns “query params → resource loading → result snapshots” into a regular module. `params` / `ui` / result snapshots all live in module state, so they are subscribable, debuggable, and replayable.

## 0) Mental model (≤ 5 keywords)

- `single entry`: all query capabilities come from `@logix/query`.
- `same-shaped API`: `Query.make(...)` plus controller handle extensions (isomorphic to how `@logix/form` is used).
- `explicit injection`: external engines are injected via `Query.Engine.layer(...)`; enabling `Query.Engine.middleware()` without injection fails explicitly (no silent fallback).
- `replaceable engine`: TanStack is the recommended default, but the engine is a swappable contract (Engine).
- `replayable diagnostics`: query pipelines emit slim, serializable evidence for explanation and replay.

## 0.1 Cost model (coarse-grained)

- Every refresh goes through `key(state) -> keyHash` gating. If `key` is `undefined`, refresh is skipped (no-op).
- Auto-trigger frequency is bounded by `deps` + `debounceMs`: the larger `debounceMs`, the more high-frequency input is converged into fewer real refreshes.
- `concurrency` defines race semantics: `switch` interrupts old in-flight work (and drops old results via the `keyHash` gate); `exhaust`/trailing coalesces intermediate changes into one trailing run (reducing meaningless write-backs).
- With external engine + middleware enabled: cache hits can avoid repeated `ResourceSpec.load`. Budget: diagnostics=off adds p95 ≤ +1%, diagnostics=full/light adds p95 ≤ +5%.

## 0.2 Diagnostic fields (explainable chain)

When diagnostics are enabled, snapshots/events carry at least these fields to answer “why did it trigger / why did it write back”:

- `resourceId`: resource identifier (from `ResourceSpec.id`)
- `keyHash`: stable key hash (computed from key)
- `concurrency`: concurrency strategy (e.g. `switch`, `exhaust-trailing`)
- `status`: `idle/loading/success/error`

## 1) Minimal usage: define a Query module

```ts
import { Schema } from 'effect'
import * as Logix from '@logix/core'
import * as Query from '@logix/query'

export const SearchSpec = Logix.Resource.make({
  id: 'demo/user/search',
  keySchema: Schema.Struct({ q: Schema.String }),
  load: ({ q }) => /* Effect.Effect<...> */,
})

export const SearchQuery = Query.make('SearchQuery', {
  params: Schema.Struct({ q: Schema.String }),
  initialParams: { q: '' },

  // ui: interaction-state namespace (toggles/panels/etc.); participates in deps/key
  ui: { query: { autoEnabled: true } },

  queries: {
    list: {
      resource: SearchSpec,
      deps: ['params.q', 'ui.query.autoEnabled'],
      triggers: ['onMount', 'onValueChange'],
      concurrency: 'switch',
      key: (state) => (state.ui.query.autoEnabled && state.params.q ? { q: state.params.q } : undefined),
    },
  },
})
```

Key points:

- `params` are business parameters; `ui` is interaction state (no preset shape, but should stay serializable/replayable).
- Each query result is written back to `state.queries[queryName]` (`ResourceSnapshot`: `idle/loading/success/error` + `keyHash`).
- TanStack v5’s `status:"pending"` + `fetchStatus` semantics are not copied into the snapshot. Logix uses `ResourceSnapshot.status` as a 4-state model; “disabled/manual/params-not-ready” are expressed by `params/ui` (and `key(state)` returning `undefined`).
- `deps` must be explicit: they are both the convergence basis and part of the explainability chain.

## 2) Compose Query as a normal submodule (recommended)

Query modules can be imported via `imports` like any other module. In React, prefer resolving the child runtime within the parent instance scope to avoid instance mismatches:

- See: [Cross-module communication (imports / $.use / useImportedModule)](./cross-module-communication)

## 3) External engine (cache/dedup) + middleware (handoff point)

If you want “cache / in-flight dedup / invalidation / optional fast-read (reduce loading flicker)” to be handled by an external engine:

```ts
import * as Logix from '@logix/core'
import { Layer } from 'effect'
import * as Query from '@logix/query'
import { QueryClient } from '@tanstack/query-core'

export const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, Query.Engine.layer(Query.TanStack.engine(new QueryClient()))),
  middleware: [Query.Engine.middleware()],
})
```

Composition semantics (“engine injection × middleware”):

- no injection + no middleware: run `ResourceSpec.load` directly (no cache/dedup)
- injection only: no fetch takeover (usually not recommended as a default)
- middleware only: config error with a hint to inject (avoid silent fallback)
- both enabled: cache/dedup enabled (recommended; TanStack is the default adapter)

### 3.1 Invalidation and tags (optional)

- `invalidate({ kind: "byResource", resourceId })` / `invalidate({ kind: "byParams", resourceId, keyHash })`: precise invalidation.
- `invalidate({ kind: "byTag", tag })`: tag-based invalidation. To avoid degrading into “refresh everything”, declare static `tags` in your query config:

```ts
queries: {
  list: {
    // ...
    tags: ['user'],
  },
}
```

### 3.2 Races and cancellation (`switch` / `AbortSignal`)

- `StateTrait.source` defaults to `switch`: a new key interrupts old in-flight fibers. Even if cancellation doesn’t reach the network layer, old results are dropped by the `keyHash` gate and won’t overwrite newer results.
- If you want “real network cancellation” (e.g. axios), use Effect’s `AbortSignal` in `ResourceSpec.load` (e.g. `Effect.tryPromise({ try: (signal) => axios.get(url, { signal }), catch: ... })`).
- See: [Interruptible I/O (cancellation and timeout)](../advanced/resource-cancellation)

### 3.3 Optimization ladder (simple → advanced)

Add capabilities gradually instead of pulling in all complexity at once:

1. **Pure pass-through (simplest)**: write `Query.make(...)` only; no engine injection, no middleware — every refresh runs `ResourceSpec.load` directly.
2. **Cache/dedup (recommended default)**: inject `Query.Engine.layer(Query.TanStack.engine(new QueryClient()))` and enable `Query.Engine.middleware()` — you get caching, in-flight dedup, and invalidation.
3. **Reduce meaningless refresh**: express “params not ready / disabled” via `key(state) => undefined`, and ensure `deps` includes only fields that truly affect the key.
4. **Avoid loading flicker (fast-read on cache hit)**: if the engine provides `peekFresh`, Query tries to hit fresh cache before refresh and writes a `success` snapshot directly.
5. **Real cancel/timeout/retry**: in `ResourceSpec.load`, use `AbortSignal` + `Effect.timeoutFail` / `Effect.retry`, so `switch` can both drop old results and actually cancel network I/O.

### 3.4 Cache cap for long-running processes (TanStack engine)

If your key space may grow without bound (e.g. a long-running search input), set an upper bound for TanStack engine’s local fast cache:

```ts
Query.TanStack.engine(queryClient, { maxEntriesPerResource: 2000 })
```

## 4) Trigger refetch from other modules (two ways, both needed)

### 4.1 Recommended: the “owner module” drives refresh for an imported child (best scope semantics)

When `BModule` imports an `AQuery`, the most robust approach is to keep linkage logic inside `BModule`’s Logic (B as owner). Resolve the imported `AQuery` handle within **B’s instance scope**, then trigger refresh explicitly.

```ts
import { Effect } from 'effect'

export const BLogic = BModule.logic(($) =>
  Effect.gen(function* () {
    const q = yield* $.use(AQuery)

    // state change in B -> update AQuery params (let auto-trigger work)
    yield* $.onState((s) => s.filters.keyword).runFork((keyword) => q.controller.setParams({ q: keyword }))

    // or: force refetch even if params didn't change
    yield* $.onState((s) => s.filters.forceReloadToken).runFork(() => q.controller.refresh())
  }),
)
```

Rules of thumb:

- “the importer owns the driving logic”: avoid Link/global listeners that manipulate child modules directly; multi-instance scenarios can refresh the wrong target.
- Prefer `setParams/setUi` when possible (explainable and aligned with deps/keyHash); use `refresh` only when you truly need a forced fetch.

### 4.2 When the trigger comes from another module: Link forwards signals, owner still refreshes

If the trigger source is `CModule` (not inside B’s own state), use `Link.make` to forward the signal into `B.actions.*`, and let `BLogic` refresh `AQuery` within B’s own scope—keeping encapsulation and instance semantics clear.

### 4.3 Advanced: collapse Query snapshot fields into a “host module” state (manual wiring)

If you strongly require “all state must live in one host module” (or you need to build a graph where multiple query snapshot fields are isomorphic to business state), you can use `Query.traits(...)` to generate `StateTraitSpec` and collapse query snapshot fields into `state.queries.*`.
However, triggering/invalidation/controller wiring must be organized explicitly by you, so only do this when necessary.
