---
title: React integration (startup strategy and cold-start optimization)
---

When using Logix in React, put `RuntimeProvider` at the boundary of your component tree (usually the app root or a route layout). All `@logixjs/react` hooks must be called under the Provider subtree.

## One entry point: use a single `fallback`

Always provide a `fallback`. It covers both:

- The Provider waiting for config/dependencies to be ready
- Suspense / deferral under `suspend` / `defer` policies

```tsx
<RuntimeProvider runtime={runtime} fallback={<Loading />}>
  <App />
</RuntimeProvider>
```

In dev/test, if you don’t provide a `fallback`, `RuntimeProvider` renders a default fallback (with timing and hints). If the wait is noticeably long, it prints actionable console warnings; if the Suspense fallback is short but causes flicker, it prints guidance to help you decide whether to switch to `sync`. In production, the default fallback is still `null`.

## What the fallback messages mean

The default fallback (or your custom fallback) usually represents two different “stuck points”:

- `Preparing Logix runtime…`: the Provider is still waiting for the runtime to be ready (Layer / Config / `preload` in `defer` mode). The subtree has not mounted yet.
- `Resolving Logix modules…`: rendering has started, but a module triggered React Suspense in the `suspend` path (module resolution/initialization). The subtree is suspended by `<Suspense>` until the module is ready.

Troubleshooting (highest priority first):

- Make sure your browser is connected to the dev server you actually intend to run (avoid multiple Vite/preview instances serving stale bundles).
- If “Preparing runtime…” is slow: reduce Layer/Config initialization cost, or use `defer + preload` to prepare key modules earlier.
- If “Resolving modules…” never finishes: add the module to `preload`, or set `logix.react.init_timeout_ms` to turn it into an explicit error.

## Startup policy: `policy.mode`

`RuntimeProvider` supports three modes:

- `suspend` (default): avoid synchronous blocking during render; suitable for most pages
- `sync`: prioritize determinism; suitable for tests/diagnostics or cases you know won’t block
- `defer`: delay cold start; with Provider gating + optional `preload`, move critical initialization after commit

```tsx
// Determinism-first: resolve synchronously (tests/diagnostics)
<RuntimeProvider runtime={runtime} policy={{ mode: 'sync' }} fallback={<Loading />}>
  <App />
</RuntimeProvider>

// Delay cold start: show fallback first, preload after commit, mount subtree when ready
<RuntimeProvider runtime={runtime} policy={{ mode: 'defer', preload: [CounterImpl] }} fallback={<Loading />}>
  <App />
</RuntimeProvider>
```

## What `defer + preload` guarantees

`defer` only guarantees that modules in the `preload` list are ready when the subtree mounts. Modules that aren’t preloaded may still suspend on the first `useModule` (you’ll see a second fallback), which is expected.

Troubleshooting:

- Add the problematic/flickering module to `preload`.
- Or switch back to default `suspend` (suspend earlier instead of blocking synchronously).

## Key strategy: when to provide an explicit `key`

By default, `useModule(Impl)` chooses the appropriate resolution path under the Provider policy and uses a component-level stable key (so you don’t have to write boilerplate everywhere).

Only pass `key` when you need to share an instance across components or explicitly partition instances:

```tsx
const sessionA = useModule(SessionImpl, { key: 'SessionA' })
const sessionB = useModule(SessionImpl, { key: 'SessionB' })
```

## Local state: useLocalModule (sync)

If you want to consolidate component-local `useState/useReducer` into Logix (editor UI state, form drafts, temporary toggles), use `useLocalModule`:

- **Always created synchronously**: it never triggers Suspense and is not controlled by `policy.mode`.
- **Don’t do I/O during construction**: for async initialization (storage reads, requests, etc.), put async work in Logic (Effect), or promote it to `useModule(Impl)` with `suspend` / `defer+preload`.

Further reading:

- [API: useLocalModule](../../api/react/use-local-module)
- [Recipe: React integration](../recipes/react-integration)

## Global defaults: ConfigProvider (`logix.react.*`)

`@logixjs/react` reads a set of global defaults from Effect’s `ConfigProvider` (scoped to the current `ManagedRuntime`). You can inject them once when creating the Runtime:

```tsx
import { ConfigProvider, Layer, ManagedRuntime } from 'effect'
import { RuntimeProvider } from '@logixjs/react'

const ReactConfigLayer = Layer.setConfigProvider(
  ConfigProvider.fromMap(
    new Map<string, string>([
      ['logix.react.gc_time', String(5 * 60_000)],
      ['logix.react.init_timeout_ms', '30000'],
    ]),
  ),
)

const runtime = ManagedRuntime.make(Layer.mergeAll(ReactConfigLayer, AppLayer) as Layer.Layer<any, never, never>)

export function Root() {
  return (
    <RuntimeProvider runtime={runtime} fallback={<Loading />}>
      <App />
    </RuntimeProvider>
  )
}
```

Common keys:

- `logix.react.gc_time`: default keep-alive window for module instances (ms). Increasing it can reduce cold starts and fallback flicker during route transitions.
- `logix.react.init_timeout_ms`: initialization timeout limit in `suspend` mode (ms).

## Common warning: synchronous blocking during render

When noticeable synchronous initialization blocking is detected during render, dev/test will print actionable warnings. Typical fixes:

- Prefer default `suspend` (and provide a `fallback`).
- In `defer`, add missing modules to `preload`.
- If needed, switch to `sync` to locate the blocker, then return to `suspend/defer` to address it.

## Txn Lanes: p95 interaction governance

If frequent typing/clicking causes visible jank and the jank mainly comes from post-transaction follow-up work (backlog: recompute/derivation/notifications), enable Txn Lanes to keep critical interactions prioritized while allowing background work to be deferred with a bound.

- Details (enable/rollback/validation): see [Txn Lanes](../advanced/txn-lanes)
- Note: Txn Lanes defers Logix internal follow-up work; it is not the same as React’s `startTransition` (which defers rendering). They can be combined but don’t replace each other.
