---
title: ModuleRuntime Instances and Lifecycles
description: Trace module instance identity across Runtime boundaries and React local scopes.
---

ModuleRuntime identity is determined by the Runtime scope that hosts it and the Module tag used to resolve it.

The canonical concepts are:

- `ModuleDef`: the definition object returned by `Logix.Module.make(...)`; it describes state/actions and exposes `.tag`.
- `Program`: the assembled business unit returned by `Logix.Program.make(...)`.
- `ModuleRuntime`: the live runtime instance you can read from and dispatch to.

## Basic mental model

```ts
export const RegionDef = Logix.Module.make("RegionModule", { state, actions })

export const RegionLogic = RegionDef.logic<RegionService>("region", ($) => {
  // reducers, watchers, effects
  return Effect.void
})

export const RegionProgram = Logix.Program.make(RegionDef, {
  initial,
  logics: [RegionLogic],
})
```

- `RegionDef` describes data and event shape.
- `RegionLogic` describes behavior.
- `RegionProgram` is the canonical unit you pass to Runtime and React host APIs.
- `RegionDef.tag` resolves the hosted instance when a Runtime scope already owns it.

## App-level shared instance

Use a Runtime boundary when the whole app or page subtree should share one instance:

```ts
const AppRuntime = Logix.Runtime.make(RegionProgram, {
  layer: RegionServiceLive,
})
```

```tsx
root.render(
  <RuntimeProvider runtime={AppRuntime}>
    <RegionPage />
  </RuntimeProvider>,
)

function RegionPage() {
  const region = useModule(RegionDef.tag)
  const state = useSelector(region, (s) => s)
}
```

Every `useModule(RegionDef.tag)` inside the same provider scope resolves the same hosted instance.

## Component-local instance

Use the Program form when each component or key should own a local instance:

```tsx
function RegionSection({ id }: { id: string }) {
  const region = useModule(RegionProgram, { key: `region:${id}` })
  const state = useSelector(region, (s) => s)
}
```

Each distinct `key` maps to one local instance within the current React scope.

## Local services

If a Program needs local service bindings, provide them through Runtime or React host options instead of exposing implementation internals:

```tsx
function RegionSection() {
  const region = useModule(RegionProgram, {
    key: "region:local",
    layer: RegionServiceLive,
  })
  const state = useSelector(region, (s) => s)
}
```

Prefer app-level `Runtime.make(Program, { layer })` when the service should be shared. Prefer `useModule(Program, { key, layer })` when the service should be local to that component scope.

## Summary

- Same Runtime scope + same Module tag -> same shared instance.
- Same Program + same local key -> same local instance.
- Different local keys -> different instances.
- Use `Program` and `ModuleTag` as the reading path. Low-level implementation objects are not part of the canonical public path.
