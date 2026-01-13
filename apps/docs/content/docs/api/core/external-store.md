---
title: ExternalStore
description: A minimal “sync snapshot + change notification” contract for feeding external push sources (or module selectors) into StateTrait.externalStore.
---

`ExternalStore<T>` is a minimal contract:

```ts
export type ExternalStore<T> = {
  getSnapshot: () => T
  getServerSnapshot?: () => T
  subscribe: (listener: () => void) => () => void
}
```

The design focuses on **synchronous snapshots** and **explicit change notifications**:

- `getSnapshot()`: synchronously return the current value (no IO/Promise; no side effects).
- `subscribe(listener)`: call `listener()` whenever the value changes, and return an unsubscribe function.
- `getServerSnapshot?()`: optional for SSR; when omitted, it falls back to `getSnapshot()`.

## Using it with `StateTrait.externalStore`

Prefer passing ExternalStore into `StateTrait.externalStore({ store })` (traits handle install/runtime resolution and writeback), instead of hand-writing subscription glue in React.

```ts
traits: Logix.StateTrait.from(StateSchema)({
  value: Logix.StateTrait.externalStore({
    store: Logix.ExternalStore.fromSubscriptionRef(ref),
  }),
})
```

## Built-in constructors

### 1) `ExternalStore.fromService(tag, map)`

Resolve a service from Effect Context, then map it into an ExternalStore. Useful for injecting “host/infrastructure subscriptions” into a module.

Constraint: this store is resolved during install/runtime; don’t call its `getSnapshot/subscribe` outside that lifecycle.

### 2) `ExternalStore.fromSubscriptionRef(ref)`

Create an ExternalStore from a `SubscriptionRef`:

- `getSnapshot()` reads synchronously via `SubscriptionRef.get(ref)` (must be pure).
- `subscribe()` listens to `ref.changes` and coalesces notifications via microtasks (multiple updates in the same microtask trigger only one notify).

### 3) `ExternalStore.fromStream(stream, { initial | current })`

Streams don’t have a synchronous “current”, so you must provide `{ initial }` or `{ current }` — otherwise it fails fast.

Use it when an approximate startup value is acceptable; if you need a reliable “current”, prefer `fromService/fromSubscriptionRef`.

### 4) `ExternalStore.fromModule(module, selector)`

Treat a module selector as an external source (Module-as-Source), typically for cross-module dependency chains:

- `moduleId` must be resolvable (don’t pass a read-only ModuleHandle).
- selectorId must be stable (unstable selectors fail fast).
