---
title: Scope and resource lifetime
description: Understand runtime, provider, local Program, and service layer lifetimes.
---

Resource lifetime follows the owner that created the resource.

## Runtime scope

A runtime created by `Runtime.make(Program, options?)` owns the module runtime graph and root service layer until it is disposed.

## Provider scope

`RuntimeProvider` exposes a runtime to React. A provider may add a subtree `layer`, but it does not automatically dispose a shared runtime passed from outside.

## Local Program scope

`useModule(Program, options)` creates or reuses a Program instance inside the current provider runtime scope.

```tsx
const editor = useModule(EditorProgram, {
  key: `editor:${id}`,
  gcTime: 60_000,
})
```

`gcTime` controls the keep-alive window after the last holder unmounts.

## Service layers

Install application-wide services near `Runtime.make(...)`. Install route/subtree-only services through `RuntimeProvider layer` when they should follow React subtree lifetime.

## Avoid

- creating a new Layer object every render;
- duplicating resource truth in React local state;
- adding lifecycle helpers that bypass Runtime ownership;
- relying on removed local-module or scope helper APIs.
