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

## Local program scope

`useModule(Program, { key })` creates a local/keyed module instance. Use it for previews, route-local editors, and isolated widgets.

## Cleanup

Use Effect scopes and finalizers. Avoid custom public destroy protocols unless the resource is outside the runtime entirely.
