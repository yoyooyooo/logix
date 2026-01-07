---
title: Runtime and ManagedRuntime
description: Introduces the basics of Logix Runtime, and how to construct and use a Runtime across different host environments.
---

The core execution unit of Logix is the **Runtime**: it hosts module state, logic, and long-lived processes (e.g. Links and background watchers). This page explains what Runtime is, how to construct one, and how to use it in React / Node / tests from a consumer’s perspective.

> Intended readers: application engineers, frontend architects, and developers who want to adopt and extend Logix Runtime in real projects.

## 1. What is a Runtime?

At the code level, Runtime mainly has two shapes:

- `ManagedRuntime` (from `effect`): an execution environment that runs Effect programs, creates Scopes, and manages resources.
- `Logix.Runtime` (from `@logixjs/core`): a thin wrapper on top of `ManagedRuntime` that combines a Root module (or Root `ModuleImpl`) and Layers into an application-level runtime tree.

The most common pattern looks like this:

```ts
import * as Logix from "@logixjs/core"
import { Effect, Layer } from "effect"

const RootDef = Logix.Module.make("Root", { state: RootState, actions: RootActions })

// Example: Root Logic depends on an external Service
class UserService extends Effect.Service<UserService>()("UserService", {
  effect: Effect.succeed({
    loadUser: (id: string) => Effect.succeed({ id, name: "Demo" }),
  }),
}) {}

const RootLogic = RootDef.logic<UserService>(($) =>
  Effect.gen(function* () {
    const svc = yield* $.use(UserService)
    // ...
  }),
)

const RootModule = RootDef.implement<UserService>({
  initial: { /* ... */ },
  logics: [RootLogic],
  imports: [/* child module.impl / service Layer */],
  processes: [/* long-lived processes (e.g. Process.link(...)) */],
})
const RootImpl = RootModule.impl

// App-level Runtime: hosts Root + submodules + long-lived processes
// Close RootImpl.layer's environment (R) explicitly via Layer.mergeAll(...), then pass it to Runtime.make.
export const AppRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    Layer.provide(UserService.Live, AppInfraLayer), // provides UserService required by RootLogic
    ReactPlatformLayer, // React platform signals
  ),
})
```

At this point:

- `RootImpl` describes what your app contains: which modules exist, what the initial state is, and which long-lived processes are installed (e.g. `Process.link`).
- `AppRuntime` is a runnable Runtime instance. You can execute Effects via its `run*` methods in React / Node / tests.

## 2. Mount a Runtime in React: RuntimeProvider

In React, use `RuntimeProvider` from `@logixjs/react` to mount a Runtime onto the component tree:

```tsx
import { RuntimeProvider } from "@logixjs/react"
import { AppRuntime } from "./runtime"
import { Router } from "./Router"

export function App() {
  return (
    <RuntimeProvider runtime={AppRuntime}>
      <Router />
    </RuntimeProvider>
  )
}
```

In this example:

- `RuntimeProvider runtime={AppRuntime}` will:
  - hold the Scope of `AppRuntime`, and clean up resources when the React app unmounts;
  - pass the Runtime down via React Context to hooks (`useModule` / `useSelector` / `useDispatch`, etc.);
- child components only need to care about which Module they use; they don’t need to construct a Runtime or manage disposal.

If your project already creates a `ManagedRuntime` elsewhere, you can also pass it to `RuntimeProvider` directly with similar behavior.

> When a module composes child modules via `imports` (e.g. a Host imports a Query), and the UI wants to read/dispatch the child module under the **parent instance scope**, use `useImportedModule(parent, childModule)` or `parent.imports.get(childModule)`:
>
> - API: [`useImportedModule`](../react/use-imported-module)
> - Guide: [React integration](../../guide/recipes/react-integration)

## 3. Local overrides: RuntimeProvider.layer

Sometimes you want to add a bit of local configuration or Services under a subtree, without affecting the global Runtime. Use the `layer` prop of `RuntimeProvider`:

```tsx
import { RuntimeProvider } from "@logixjs/react"
import { Layer, Context } from "effect"

// A simple Service example
interface StepConfigService {
  readonly step: number
}

class StepConfig extends Context.Tag("StepConfig")<StepConfig, StepConfigService>() {}

// Root: step = 1
const BaseStepLayer = Layer.succeed(StepConfig, { step: 1 })
// A subtree: step = 5 (overrides the root)
const BigStepLayer = Layer.succeed(StepConfig, { step: 5 })

export function Page() {
  return (
    <RuntimeProvider runtime={AppRuntime} layer={BaseStepLayer}>
      {/* this subtree sees step = 1 by default */}
      <Section label="Root area · step=1" />

      {/* stack another Env Layer under a subtree and override the same Service */}
      <RuntimeProvider layer={BigStepLayer}>
        <Section label="Local area · step=5" />
      </RuntimeProvider>
    </RuntimeProvider>
  )
}
```

Semantics summary:

- `runtime`:
  - if the inner Provider also passes `runtime`, it **fully switches to a new Runtime** and no longer inherits the outer one;
  - if the inner Provider does not pass `runtime`, it inherits the nearest Provider’s Runtime (forming a fractal runtime tree).
- `layer`:
  - along the same Runtime chain, multiple Providers’ `layer`s stack;
  - when multiple `layer`s provide the same Service Tag, the **inner Provider wins**, which is great for “almost the same but slightly different” local configuration (e.g. different step size, theme, feature flags).

Internally, `RuntimeProvider` creates a Scope for each `layer` and closes it on unmount to avoid resource leaks.

If you need to always read a singleton provided by the **root provider** of the current runtime tree (e.g. global modules/services), use `Logix.Root.resolve(Tag)`:

```ts
import * as Logix from "@logixjs/core"
import { useRuntime } from "@logixjs/react"

const runtime = useRuntime()
const auth = runtime.runSync(Logix.Root.resolve(GlobalAuth.tag))
```

Inside Logic, if you want to explicitly read the root provider singleton, use `yield* $.root.resolve(Tag)`:

```ts
import * as Logix from "@logixjs/core"
import { Effect } from "effect"

const MyLogic = MyModule.logic(($) =>
  Effect.gen(function* () {
    const auth = yield* $.root.resolve(GlobalAuth.tag)
    // ...
  }),
)
```

They share the same semantics: both ignore local overrides from `RuntimeProvider.layer`. The difference is that `$.root.resolve` is a Bound API convenience for Logic.

## 4. Runtime vs Module / ModuleImpl / Process

You can think of a Runtime as a “container that runs a set of modules and processes”, while Module objects (`Module`) / `ModuleImpl` / `Process` are the contents inside that container:

- **Module (program module)**:
  - define a module via `const RootDef = Logix.Module.make("Root", { state, actions })`, then build it with `RootDef.implement({ initial, logics, imports, processes })` to get `RootModule`;
  - you can pass it directly to `Logix.Runtime.make(...)` or consume it in React via `useModule(...)` (internally it uses the `.impl` blueprint).
- **ModuleImpl (blueprint)**:
  - the underlying blueprint (`module.impl`) of a Module object; it contains `layer` / `imports` / `processes` wiring info;
  - mainly used for lower-level assembly/composition (e.g. `imports: [Child.impl]`).
- **Process (long-lived process)**:
  - define a long-lived process via `Logix.Process.make({ ... }, effect)`, or define a cross-module collaboration via `Logix.Process.link({ modules: [...] }, ($) => Effect)`;
  - a Process is driven by a trigger source (moduleAction/moduleStateChange/platformEvent/timer) plus concurrency and error policies;
  - it’s usually installed as part of Root or a `ModuleImpl` under `processes`, so Runtime can install and supervise it on startup; in React you can also use `useProcesses(...)` to install a Process under a UI subtree scope.

The Runtime’s responsibility is to assemble these modules and processes into a runnable tree, and provide a unified execution entry.

## 5. How should I choose these pieces?

Use these rules of thumb:

- **Small scenarios / local state**:
  - use `useLocalModule` or `useModule(Impl)` directly in components; no need to construct a Runtime explicitly.
- **Page-level / app-level state**:
  - construct a Runtime with a Root module via `Logix.Runtime.make`;
  - wrap at the React root (or route level) with `RuntimeProvider runtime={...}`;
  - in components, use `useModule` / `useSelector` / `useDispatch` only.
- **Local configuration differences** (e.g. different step size in different areas, theme variants, experiment flags):
  - reuse the same Runtime;
  - under the target subtree, nest a `RuntimeProvider layer={...}` to provide local Env so the inner subtree can override the outer one.

If you want complete examples, check the `examples/logix-react` project in this repository, which includes:

- a global Runtime built via `Logix.Runtime.make`;
- local Env customization via `RuntimeProvider.layer`;
- multi-module collaboration in React via `Process.link` (or an equivalent Link entry).

## 6. Async Layers and latency

One more note: `RuntimeProvider.layer` supports async Layers. That means the **real initialization time** of a Layer becomes visible in UI behavior.

Implementation-wise:

- when `layer` is provided, `RuntimeProvider` builds a Context asynchronously via `Layer.buildWithScope(layer, scope)`;
- before the Layer finishes building, it only renders `fallback` (defaults to `null`), so children won’t run before the Env is ready;
- after it succeeds, the new Context is applied to the subtree, and the old Scope is safely closed.

Implications and recommendations:

- if your `layer` does heavy I/O initialization (e.g. remote config, DB connection), the first paint / navigation for that subtree will be extended by that init time. This is a “true exposure” of cost, not extra overhead;
- prefer putting “slow initialization” into the **Runtime startup** (e.g. merge it when calling `Logix.Runtime.make`). In React, `RuntimeProvider.layer` is better suited for “lightweight, in-memory” local variants (step size, theme, feature flags);
- if you switch `layer` frequently, each switch triggers a new build. The old Layer is closed after the new one becomes ready. You won’t observe a half-built Env, but you still need to ensure the init cost is acceptable.

Simple mnemonic: put heavy dependencies in the Runtime, and lightweight configuration in `RuntimeProvider.layer`.

## 7. Run programs in Node/scripts: `Runtime.runProgram` / `Runtime.openProgram`

In scripts, demos, or CLI tools, you often want a single entry that:

- boots the Root module (including its `imports` / `processes` / `logics`);
- runs the main program;
- releases resources after it ends (close Scope / run finalizers).

For these scenarios, use the program runner from `@logixjs/core`:

- `Runtime.runProgram(root, main, options?)`: one-shot entry (boot → main → release)
- `Runtime.openProgram(root, options?)`: resourceful entry (returns `ctx`, good for interactive scripts and multi-stage execution)

### 7.1 `runProgram`: one-shot entry (explicit exit policy)

The runner does **not** infer “when to exit” automatically. Many module logics register long-lived listeners (watchers / subscriptions / Links) that won’t end naturally. You must express an exit condition explicitly in `main` (e.g. wait for a state condition, wait for a signal, or allow Ctrl+C to trigger shutdown).

```ts
import * as Logix from "@logixjs/core"
import { Effect, Stream } from "effect"
import { AppRoot } from "./app-root"

await Logix.Runtime.runProgram(AppRoot, ({ $ }) =>
  Effect.gen(function* () {
    const counter = yield* $.use(CounterModule)
    yield* counter.dispatch({ _tag: "inc", payload: undefined })

    // Explicit exit: end the main program once value >= 1
    yield* counter
      .changes((s) => s.value)
      .pipe(Stream.filter((n) => n >= 1), Stream.take(1), Stream.runDrain)
  }),
)
```

### 7.2 `openProgram`: resourceful entry (reuse the same runtime tree)

When you want to run multiple tasks in stages on the same runtime tree, use `openProgram`:

- the returned `ctx` is already booted and ready for interaction;
- closing `ctx.scope` triggers resource release (useful for interactive scripts and platform runners).

> Tip: in Node/CLI scenarios, `runProgram/openProgram` handles SIGINT/SIGTERM by default and closes `ctx.scope` for graceful shutdown. Disable it via `handleSignals: false` if you don’t need it.

## 8. Advanced: Custom HostScheduler (tests / special hosts)

Logix’s TickScheduler relies on host scheduling (microtask / macrotask / raf / timeout) to establish tick boundaries and yield-to-host behavior. By default, Runtime uses a built-in global HostScheduler (auto-selected for Browser / Node).

When to pass `hostScheduler`:

- **Tests**: you want deterministic scheduling and precise flushing of microtasks/macrotasks, instead of `sleep/setTimeout`.
- **Custom hosts**: you need to integrate scheduling with a non-standard host API (e.g. WebWorker, embedded containers, custom event loops).

Recommended: inject it once when constructing the Runtime:

```ts
import * as Logix from "@logix/core"
import * as LogixTest from "@logix/test"
import { Layer } from "effect"

const hostScheduler = LogixTest.Act.makeTestHostScheduler()
const runtime = Logix.Runtime.make(RootImpl, {
  hostScheduler,
  layer: Layer.mergeAll(
    // Example: tweak TickScheduler config in tests (to make yield-to-host easier to trigger)
    LogixTest.Act.tickSchedulerTestLayer({ maxSteps: 1 }),
  ),
})
```

If you must override HostScheduler via Layers (not recommended as the default path), keep in mind: **Layers capture dependencies at build time**. If a Layer (e.g. TickScheduler) reads HostScheduler while building, overriding the final Env with `Layer.mergeAll(...)` will not affect it. Provide HostScheduler to the build stage of the dependent Layer via `Layer.provide(...)`:

```ts
const hostLayer = LogixTest.Act.testHostSchedulerLayer(hostScheduler)
const tickLayer = LogixTest.Act.tickSchedulerTestLayer({ maxSteps: 1 }).pipe(Layer.provide(hostLayer))
const runtime = Logix.Runtime.make(RootImpl, { layer: Layer.mergeAll(hostLayer, tickLayer) })
```
