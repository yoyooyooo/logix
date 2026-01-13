---
title: FAQ
description: Frequently asked questions about Logix, to help you find answers quickly.
---

## Concepts and choosing a solution

### What’s the difference between Logix and Redux/Zustand?

| Dimension     | Redux/Zustand                   | Logix                              |
| ------------- | ------------------------------- | ---------------------------------- |
| Async         | Needs middleware (thunk/saga)   | Built-in Effect + Flow             |
| Concurrency   | Managed manually                | Built-in `runLatest/runExhaust`    |
| Type safety   | Maintained manually             | Derived automatically from Schema  |
| Observability | Requires external DevTools      | Built-in event pipeline            |

In short: if your app has complex async/concurrency logic, Logix tends to be a better fit; if you only need simple global state, Zustand can be lighter.

### What’s the difference between Logix and XState?

- **XState** fits scenarios that require strict state machine modeling (finite states + explicit transitions).
- **Logix** fits data-driven application logic (state can be any structure + reactive flows).

They can also be used together: use XState for the workflow state machine, and Logix for business data.

### When should I use `@logixjs/form` instead of a plain Module?

Use a plain Module when:

- It’s a single-field input (search box, toggle).
- You don’t need complex validation.

Use `@logixjs/form` when:

- It’s a multi-field form (3+ fields).
- You need field-level validation and error display.
- You need dynamic arrays (add/remove/update/reorder).
- You need cross-field derived logic and linkage.

### Is Effect’s learning curve steep?

You don’t need to learn every concept in Effect from day one. Logix’s Bound API (`$`) wraps most low-level details:

```ts
// You don't need to know Effect details—just this:
yield* $.onAction('save').run(() => $.state.update((s) => ({ ...s, saved: true })))
```

Only when you need advanced capabilities (retries, timeouts, resource management) do you need to go deeper into Effect.

---

## Usage and debugging

### How do I view Action history in DevTools?

1. Enable DevTools in the Runtime config:
   ```ts
   const runtime = Logix.Runtime.make(RootImpl, { devtools: true })
   ```
2. Add the DevTools component in your React app:
   ```tsx
   import { LogixDevtools } from '@logixjs/devtools-react'
   ;<LogixDevtools position="bottom-left" />
   ```
3. Open your browser and inspect Action events in the timeline.

### Why didn’t my watcher trigger?

Common causes:

1. **Your selector returns the same reference**: `$.onState((s) => s)` triggers on every state change, but `$.onState((s) => s.user)` only triggers when `user` changes.
2. **Your watcher is in the setup phase**: make sure `$.onAction/$.onState` is called in the run phase (inside `Effect.gen`).
3. **The Logic isn’t installed**: check that `implement({ logics: [...] })` includes the Logic.

### How do I correctly cancel an in-flight request?

Use `runLatest`:

```ts
yield* $.onAction('search').runLatest((keyword) =>
  Effect.gen(function* () {
    const results = yield* api.search(keyword)
    yield* $.state.update((s) => ({ ...s, results }))
  }),
)
```

When a new `search` Action arrives, the previous request is automatically cancelled.

---

## Performance and production

### What is the overhead of Logix?

- **State updates**: based on `SubscriptionRef`, change detection is O(1).
- **Derived computation**: supports dirty checking and only recomputes affected traits.
- **DevTools**: overhead can be controlled via `diagnosticsLevel`.

In most scenarios the overhead is negligible. For performance-sensitive cases, see [Performance and optimization](./guide/advanced/performance-and-optimization).

### How do I disable debug output in production?

```ts
const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    Logix.Debug.layer({ mode: 'prod' }), // production mode
  ),
  devtools: false, // disable DevTools
})
```

### What about SSR/RSC support?

- **SSR**: you can pre-render state on the server via `Runtime.runPromise`.
- **RSC**: running Modules inside Server Components is not directly supported yet; prefer using Modules behind a Client boundary.

---

## More resources

- [Troubleshooting](./guide/advanced/troubleshooting): diagnostics and common fixes
- [Debugging and DevTools](./guide/advanced/debugging-and-devtools): the full debugging guide
- [React integration recipes](./guide/recipes/react-integration): common patterns
