# React Host Cleanup Inventory

## Existing Cleanup Surfaces

- `RuntimeProvider.tsx` builds provider projection from a supplied runtime or parent runtime.
- `runtimeBindings.ts` owns layer scope creation and closes scopes on dependency change or unmount.
- `RuntimeExternalStore.ts` caches external stores per runtime and topic in a WeakMap.
- `ModuleCache.ts` owns module runtime cache and imported module scopes.

## HMR Gap

- External store cleanup is bound to React subscription lifetimes.
- Layer binding cleanup is local to provider effects.
- There is no shared host cleanup summary that can be attached to a runtime lifecycle event.
- There is no single helper to dispose cached external stores for a runtime after owner replacement.

## Target

- Keep host cleanup under React internals.
- Summarize host cleanup separately from core runtime resources.
- Feed host cleanup summary into lifecycle evidence without making React the lifecycle authority.
