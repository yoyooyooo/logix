---
title: ModuleRuntime Instances and Lifecycles
---

This page answers a few common questions:

- “If I use the same module in different places, is it the same instance?”
- “What’s the difference between `useModule(Impl)` and `Layer.build` in a script?”
- “If I want to build the Env once and reuse it everywhere, what should I do?”

We’ll tie this together with four concepts:

- `ModuleDef`: the module definition object (returned by `Logix.Module.make(...)`) that only describes the shape of State/Actions; it exposes `.tag` (a ModuleTag) for DI/instance resolution.
- `Module`: the runnable module object / program module (returned by `ModuleDef.implement(...)`); it exposes `.impl` (a ModuleImpl blueprint) for wiring.
- `ModuleImpl`: a blueprint (on `module.impl`) describing “how to construct/mount this Module under a given Env”.
- `ModuleRuntime`: the runtime instance — you can also think of it as “a live store tree instance”.

## 1. Basic mental model

```ts
// Blueprint: describes only data and event shapes
export const RegionDef = Logix.Module.make("RegionModule", { state, actions })

// Logic: describes how to handle events/state on this blueprint
export const RegionLogic = RegionDef.logic<RegionService>(/* ... */)

// Program module: binds the blueprint and logic together
export const RegionModule = RegionDef.implement({
  initial,
  logics: [RegionLogic],
})

export const RegionImpl = RegionModule.impl
```

- `RegionDef`: only describes “what Region state looks like / what actions exist”.
- `RegionLogic`: describes “Region behavior logic”.
- `RegionModule`: describes “how this module mounts into the runtime in an Env that provides `RegionService`” (where `RegionModule.impl` / `RegionImpl` is the underlying blueprint) — there’s no concrete instance yet.
- `ModuleRuntime`: the actual instance (the one you can `getState` / `dispatch` on).

All following examples focus on “how to construct / reuse this ModuleRuntime instance”.

## 2. In scripts: build Layer once, reuse ModuleRuntime

In scripts or background jobs, the most direct approach is:

```ts
const AppLayer = Layer.mergeAll(
  RegionServiceLive, // provide the Service implementation
  RegionImpl.layer, // the module implementation layer
)

const main = Effect.scoped(
  Effect.gen(function* () {
    // 1) Build the Env once on the current Scope (Layer.buildWithScope)
    const env = yield* Layer.buildWithScope(AppLayer, yield* Effect.scope)

    // 2) Get the runtime from the same Env via the module tag
    const region = Context.get(env, RegionDef.tag)

    // 3) Reuse the same region instance for all subsequent operations
    yield* region.dispatch({ _tag: "region/init", payload: undefined })
    const state1 = yield* region.getState
    const state2 = yield* region.getState
  }),
)

void Effect.runPromise(main)
```

Key points:

- `Layer.buildWithScope(AppLayer, scope)` is called only once.
- In that `env`, `Context.get(env, RegionDef.tag)` always returns the same `ModuleRuntime`.
- As long as you reuse the same `env`, you’re operating on the same instance.

If you prefer working with `ManagedRuntime`, you can wrap it like this:

```ts
const AppLayer = Layer.mergeAll(RegionServiceLive, RegionImpl.layer)
const runtime = ManagedRuntime.make(AppLayer)

const program = Effect.gen(function* () {
  const region = yield* RegionDef.tag
  // region here is the ModuleRuntime instance from AppLayer
})

void runtime.runPromise(program)
```

`ManagedRuntime.make(AppLayer)` builds the layer once and manages the Scope; all programs run through this runtime share the same set of ModuleRuntime instances.

## 3. In React: global vs local instances

In React, there are two common patterns:

### 3.1 Global instance: build Env at the App boundary

If you want the whole app to share one Region instance, compose the layer at the App boundary:

```ts
const AppLayer = Layer.mergeAll(RegionServiceLive, Region.impl.layer)
const appRuntime = ManagedRuntime.make(AppLayer)

root.render(
  <RuntimeProvider runtime={appRuntime}>
    <RegionPageUsingModuleTag />
  </RuntimeProvider>,
)

function RegionPageUsingModuleTag() {
  // Using Module/Tag form here
  const region = useModule(RegionModule) // or Region.tag
  const state = useSelector(region, (s) => s)
  // Everywhere using RegionModule shares the instance inside appRuntime
}
```

In this mode:

- `AppLayer` is built only once.
- `RegionModule` / `Region.tag` points to the single Region runtime inside that env.
- All `useModule(RegionModule)` (Tag mode) share the same instance.

### 3.2 Local instance: build a component-local Scope via ModuleImpl

If you want **each component to have its own Region instance** (like a component-local store), use the ModuleImpl form:

```tsx
function RegionSection() {
  const region = useModule(Region) // default: equivalent to useModule(Region.impl)
  const state = useSelector(region, (s) => s)
  // This region instance belongs only to this component
}
```

Internally, this path:

1. creates a component-local Scope,
2. builds `Region.impl.layer` within that Scope,
3. gets the runtime from the built Context via `Region.tag`.

Each component calling `useModule(Region)` gets an independent ModuleRuntime instance, and it does not affect the app-level global instance.

## 4. Local services + ModuleImpl: withLayer / withLayers

Sometimes you want to bind Service implementations locally without relying on a global `RuntimeProvider`. Use `ModuleImpl.withLayer` / `withLayers`:

```ts
// Service layers
const RegionServiceLive = Layer.succeed(RegionService, { /* ...implementation... */ })
const LoggerServiceLive = Layer.succeed(LoggerService, { /* ...implementation... */ })

// 1) One layer: module.withLayer
export const RegionWithService = Region.withLayer(RegionServiceLive)

// 2) Multiple layers: module.withLayers (sugar)
export const RegionWithMoreServices = Region.withLayers(
  RegionServiceLive,
  LoggerServiceLive,
)
```

Consume directly in React:

```tsx
function RegionSection() {
  // The Impl already includes local Service layers
  const region = useModule(RegionWithMoreServices)
  const state = useSelector(region, (s) => s)
}
```

The Region instance is still “one per component”; the only difference is that the Env is pre-provided on the Impl.

## 5. Summary: when is it the “same instance”?

You can remember it as:

- **same `Layer.build` + same `ModuleTag` (identity anchor)** → same `ModuleRuntime` instance;
- **different `Layer.build`** → different instances, even if you use the same `ModuleImpl`;
- **in React**:
  - `useModule(RegionModule)` (Tag) + global AppLayer → shared app-level instance;
  - `useModule(Region)` → one local instance per component;
  - `useModule(RegionWithService)` → one local instance per component, with Service Env built-in;
  - when nesting multiple `RuntimeProvider layer={...}` in one runtime chain, the inner provider’s `layer` overrides outer env bindings for tags with the same identity (useful for local configuration that’s “almost the same but slightly different”).

Recommended practice:

- For a “page/app singleton store”: Tag form (`RegionModule` / `Region.tag`) + app-level Layer/Runtime.
- For a “component-local store”: module-object form (`useModule(Region)` / `Region.withLayer(...)`).
