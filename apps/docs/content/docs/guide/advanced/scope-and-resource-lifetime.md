---
title: Scope and resource lifetime
description: Where runtime, provider, local program, and service lifetimes begin and end.
---

A resource should live at the smallest scope that matches its ownership.

## Runtime scope

The runtime owns the root program, global services, scheduling, diagnostics, and control-plane access.

```ts
const runtime = Logix.Runtime.make(AppProgram, { layer: AppLayer })
```

## Provider scope

A provider can add local layers for a subtree. Use this for route-specific services and test doubles.

## Development hot lifecycle

Development HMR has one owner: the host dev lifecycle carrier. Enable `logixReactDevLifecycle()` in Vite or `installLogixDevLifecycleForVitest()` in test setup once at the host boundary.

Application code still creates the runtime normally and passes it to `RuntimeProvider`. `RuntimeProvider` projects the current runtime into React; it does not own lifecycle truth and must not `dispose` a borrowed runtime.

The carrier delivers the hot boundary to the runtime owner. The owner chooses `reset` when a successor runtime exists and `dispose` when no successor exists. Evidence is exported as `runtime.hot-lifecycle`; that event is evidence, not an authoring API.

## Local program scope

`useModule(Program, { key })` creates a local/keyed module instance. Use it for previews, route-local editors, and isolated widgets.

## Cleanup

Use Effect scopes and finalizers. Avoid custom public destroy protocols unless the resource is outside the runtime entirely.
