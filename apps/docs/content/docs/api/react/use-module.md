---
title: useModule
description: API Reference for useModule hook
---

# useModule

`useModule` is the primary Hook for consuming Logix Modules in React.  
It can both **create/manage a local ModuleRuntime** (when you pass a module object with `.impl` or a `ModuleImpl`), and **connect to an existing global ModuleRuntime** (when you pass a module definition object, a `ModuleTag`, or a `ModuleRuntime` itself).

## Basic usage

```tsx
import { useModule, useSelector } from '@logix/react'
import { CounterDef } from './modules/counter'

function Counter() {
  // Get the Module runtime instance
  const counter = useModule(CounterDef)

  // Read state
  const count = useSelector(counter, (s) => s.count)

  // Dispatch an Action
  const increment = () => counter.dispatch({ _tag: 'increment' })

  return <button onClick={increment}>{count}</button>
}
```

## API

### 1. `useModule(handle, options?)` (local / session-scoped Module)

- **`handle`**: a `ModuleImpl` or a “module object with `.impl`” — used to create/manage a local instance.
- **`options`**: only available when the first argument is a `ModuleImpl` or a “module object with `.impl`”:
  - `key?: string`
    - distinguishes “session instances” within the same `ManagedRuntime`
    - `useModule(Impl, { key })` shares the same ModuleRuntime for the same `key`
    - without `key`, a “component-local” instance is still created (it does not fall back to a global singleton)
    - **the “session instance” semantics of `key` are the same whether `suspend` is `true` or `false`; only the construction path differs (sync vs Suspense async).**
  - `gcTime?: number`
    - “keep-alive time” (ms) for session-scoped instances; only effective in the `useModule(Impl, { key, gcTime })` form
    - when omitted, the value comes from the RuntimeProvider config snapshot: call site > Runtime Layer `ReactRuntimeConfig.replace` > ConfigProvider `logix.react.gc_time` > default ~500ms (StrictMode jitter protection)
    - see [React integration (startup policy and cold-start optimization)](../../guide/essentials/react-integration) for “global default config” examples.
  - `deps?: React.DependencyList`
    - when deps change, it is treated as “this session’s dependencies changed”, and the corresponding `ModuleRuntime` is rebuilt
    - internally a stable hash is used to avoid StrictMode key jitter
  - `suspend?: boolean` / `initTimeoutMs?: number`
    - when `suspend: true`, `useModule` uses an async construction path and integrates with React `Suspense` by throwing a Promise
    - `initTimeoutMs` sets the “maximum allowed init duration”; on timeout it throws an error (handled by an outer ErrorBoundary). Default source is similar to `gcTime`: call site > Runtime Layer `ReactRuntimeConfig.replace` > ConfigProvider `logix.react.init_timeout_ms` > disabled by default
    - when `suspend: true`, you must provide a stable `key` (see the Suspense section in the React integration guide).

> Note: `options` are **only valid in the `useModule(Impl, options)` form**.  
> When the first argument is a module definition object / `ModuleTag` / `ModuleRuntime`, the second argument can only be a selector function, not an options object.

### 2. `useModule(handle, selector, equalityFn?)` (inline selector)

```ts
const count = useModule(CounterImpl, (s) => s.count)
const count2 = useModule(CounterDef, (s) => s.count)
```

- **`handle`** can be:
  - a module object with `.impl` or a `ModuleImpl` (local/session-scoped Module implementation)
  - a module definition object (returned by `Logix.Module.make(...)`) or a `ModuleTag` (global Module, typically registered via `Runtime.make`)
  - an existing `ModuleRuntime` instance
- **`selector`**: `(state) => slice` — inline selector; subscribes to a slice of state
- **`equalityFn`**: optional; custom equality function to control when the component re-renders

When you pass a selector, `useModule` returns the selector result directly instead of the full `ModuleRuntime`.  
In this form, options objects are not accepted.

### 3. `useModule(module def / ModuleTag)` / `useModule(runtime)` (connect to a global Module)

These forms **do not create a new ModuleRuntime**; they connect to an existing global runtime:

- `useModule(CounterDef)` / `useModule(CounterDef.tag)`
  - `CounterDef` is the module definition object returned by `Logix.Module.make(...)` (ModuleDef; it exposes `.tag` as the identity anchor)
  - requires an outer `RuntimeProvider` and that the runtime includes the module
  - commonly used for app-level global Modules (e.g. current user, global config)
- `useModule(existingRuntime)`
  - directly connects to an already obtained `ModuleRuntime` object; it’s purely a “wiring” tool

In these forms:

- `useModule` does not create/dispose runtimes; it only resolves the instance from the current React runtime context.
- The second argument can only be a selector function; you **cannot** pass options like `key/gcTime/suspend`.

## Behavior

### Execution timing and lifecycle mental model

A useful rule is: **whoever creates the runtime owns the lifecycle**.

1. **`useModule(Impl, options?)` (local / session-scoped)**
   - On the first call with a given `(Impl, key, depsHash)` combination, `useModule` creates the corresponding `ModuleRuntime`.
   - Within the same `ManagedRuntime`, the same `key` reuses the same `ModuleRuntime`.
   - When all components using that `key` unmount, the runtime is disposed after the `gcTime` window (and triggers `onDestroy`).

2. **`useModule(module def / ModuleTag)` / `useModule(runtime)` (global connect)**
   - The creation timing of `ModuleRuntime` is decided by `Runtime.make` / `ManagedRuntime` (usually at app startup).
   - `useModule` only connects the component to an existing runtime; it does not create or dispose runtime instances.
   - Suitable for global modules that “initialize once at app start and stay for the whole session”.

### See Also

- [Guide: Modules & State](../../guide/essentials/modules-and-state)
- [Guide: Suspense & Async](../../guide/advanced/suspense-and-async)
- [Guide: React integration and session patterns](../../guide/recipes/react-integration)
- [API: useImportedModule](./use-imported-module)
