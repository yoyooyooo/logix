---
title: React integration
description: Mount a runtime, resolve module instances, and choose between shared and local instance routes.
---

React integration is built on one host route:

- mount a runtime with `RuntimeProvider`
- resolve an instance with `useModule(...)`
- read with `useSelector(...)`
- write with `useDispatch(...)` or the handle itself

## RuntimeProvider

Put `RuntimeProvider` at the subtree boundary:

```tsx
<RuntimeProvider runtime={runtime}>
  <App />
</RuntimeProvider>
```

All hooks from `@logixjs/react` must run inside that subtree.

`RuntimeProvider` projects an existing runtime. The boundary that creates the runtime owns its lifecycle. During development HMR, that owner applies `reset` for replacement and `dispose` for no-successor teardown.

Development HMR is activated outside component code. Enable the dev lifecycle carrier once at the host boundary, for example `logixReactDevLifecycle()` in Vite or `installLogixDevLifecycleForVitest()` in tests. Normal React code keeps using `RuntimeProvider`.

Hot lifecycle diagnostics use the existing `runtime.hot-lifecycle` evidence event.

## Shared instance

Use:

```tsx
const module = useModule(ModuleTag)
```

when the runtime already hosts one shared instance.

## Local or keyed instance

Use:

```tsx
const module = useModule(Program, { key: "session-a" })
```

when a subtree needs its own instance or a keyed session instance.

## Reads and writes

Reads stay on:

- `useSelector(...)`

Writes stay on:

- `useDispatch(...)`
- `handle.dispatch(...)`

## Startup policy

`RuntimeProvider` may control startup behavior through:

- `fallback`
- `policy`
- `layer`

These props affect startup and local environment wiring.
They do not define a second host law.

They also do not make `RuntimeProvider` the hot lifecycle owner. Host cleanup may be summarized for diagnostics, but the owner decision stays at the runtime creation boundary.

## Advanced routes

Advanced routes include:

- `useLocalModule(...)`
- `useImportedModule(...)`
- `ModuleScope`

They remain valid, but they are not the smallest default route.

## See also

- [RuntimeProvider](../../api/react/provider)
- [useModule](../../api/react/use-module)
- [useSelector](../../api/react/use-selector)
