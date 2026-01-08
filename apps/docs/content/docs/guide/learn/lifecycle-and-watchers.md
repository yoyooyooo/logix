---
title: Lifecycle and watcher patterns
description: How module lifecycle, long-running watchers, and host platform lifecycle work together (React included).
---

In Logix, business logic is not just a function that runs once and returns. It runs as a set of long-lived processes (watchers) inside a **module lifecycle**.
From an app developer’s perspective, this page breaks it down into three layers:

1. The module lifecycle itself: when instances initialize and when they dispose.
2. Long-running watchers: how they are mounted and when they stop automatically.
3. The host platform lifecycle: tab visibility, app background/foreground, session reset, and how these integrate with modules.

### Who is this for?

- You can write `$.onAction / $.onState`, but you’re unsure when watchers start and stop.
- You’re integrating Logix into React (or multi-platform apps) and want a clear model of “module instance vs component vs session”.

### Prerequisites

- You’ve read [Lifecycle](../essentials/lifecycle) and [Flows & Effects](../essentials/flows-and-effects).
- You understand React component mount/unmount at a basic level.

### What you’ll get

- A clear separation between “module lifecycle” vs “platform lifecycle”.
- The ability to decide where a piece of logic belongs (which Module) and which watcher form to use in complex pages.
- A practical checklist for architecture/code review around lifecycle and watchers.

Here’s a quick table to help you decide “which layer to use” during code review:

| Concern                         | Recommended tool                                      | Typical scenarios                                 |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| When a module instance exists   | `$.lifecycle.onInit/onDestroy`                        | load config/data once on page open                |
| Long-running listen + react     | `$.onAction/$.onState + .run*` watchers               | form submit, polling, field linkage               |
| Host background/foreground/reset| `$.lifecycle.onSuspend/onResume/onReset` + Platform   | tab visibility, logout, session reset              |

## 1. Module lifecycle: onInit / onDestroy

Each Module instance (ModuleRuntime) has a clear lifecycle:

- On create: the module is mounted into an Effect Scope.
- While running: Flows/watchers in Logic keep observing State/Actions.
- On dispose: the Scope closes and all associated resources are cleaned up.

In Logic, use `$.lifecycle` to explicitly declare init/destroy behavior:

```ts
const Profile = Logix.Module.make('Profile', {
  state: Schema.Struct({
    status: Schema.Literal('idle', 'loading', 'ready', 'error'),
    detail: Schema.optional(Schema.Any),
  }),
  actions: {
    reload: Schema.Void,
  },
})

const ProfileLogic = Profile.logic(($) => {
  // onInit: load profile on first start (setup-only registration; scheduled by the Runtime)
  $.lifecycle.onInit(
    Effect.gen(function* () {
      yield* $.state.update((s) => ({ ...s, status: 'loading' }))
      const detail = yield* UserService.getProfile()
      yield* $.state.update((s) => ({ ...s, status: 'ready', detail }))
    }),
  )

  // onDestroy: cleanup before instance disposal (optional)
  $.lifecycle.onDestroy(Effect.log('[Profile] module destroyed'))

  return Effect.void
})
```

Key points:

- `onInit` runs once on the first start of the module instance; use it for “one-time work” like loading config or initializing caches.
- `onDestroy` is for releasing resources (closing connections, unsubscribing, etc.). Avoid business writes here because the module is about to disappear.
- The exact start/dispose timing is decided by the Runtime:
  - Global modules (provided by an app-level Runtime) usually correspond to app start/stop.
  - Local ModuleImpl instances (e.g. created via `useModule(Impl)`) usually correspond to component mount/unmount.

> Tip: in React 18 Strict Mode, dev builds perform extra mount/unmount retries. Logix makes Scope handling idempotent at runtime, but you should still keep `onInit` safe under repeated calls (e.g. avoid writing irreversible external side effects).

## 2. Watchers: how long-running logic runs

Most business logic is a long-running “listen and react” process, for example:

- watch an Action stream to handle form submit
- watch state changes to trigger API calls or cascading updates
- poll a service status in a loop

In Logix, this is typically written as **watchers**, built with `$.onAction/$.onState` and execution helpers like `$.flow.run/runFork`.
In `examples/logix-react`, you can see two common watcher patterns:

```ts
// runFork: each event runs in its own Fiber; the watcher stays mounted as a long-lived subscriber
const CounterRunForkLogic = Counter.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction('inc').runFork($.state.update((s) => ({ ...s, value: s.value + 1 })))

    yield* $.onAction('dec').runFork($.state.update((s) => ({ ...s, value: s.value - 1 })))
  }),
)

// Effect.all + run: mount multiple watchers at once; each watcher handles events sequentially via run
const CounterAllLogic = Counter.logic(($) =>
  Effect.all(
    [
      $.onAction('inc').run($.state.update((s) => ({ ...s, value: s.value + 1 }))),
      $.onAction('dec').run($.state.update((s) => ({ ...s, value: s.value - 1 }))),
    ],
    { concurrency: 'unbounded' },
  ),
)
```

No matter which style you choose, two invariants hold:

- **Mounting scope**: watchers run only while the corresponding Module instance exists. When the ModuleRuntime Scope closes, watchers are interrupted and cleaned up automatically (no manual unsubscribe needed).
- **Runtime environment**: watchers run inside the Module’s Logic environment, so it’s safe to use `$.state`, `$.actions`, `$.use`, etc.

> If you come from React, think of a watcher as “a useEffect attached to the Module”. The key difference is that it is decoupled from the component tree, does not cause UI re-renders, and its lifecycle is managed by the Runtime.

## 3. Platform lifecycle: onSuspend / onResume / onReset

Beyond module lifecycle, many scenarios need the **host platform lifecycle**, for example:

- browser tab goes background/hidden
- app background/foreground transitions
- logout / clear session (“soft reset”)

For these, use platform-level lifecycle hooks in Logic:

```ts
const PollingModule = Logix.Module.make('Polling', {
  state: Schema.Struct({
    lastUpdatedAt: Schema.optional(Schema.Number),
    paused: Schema.Boolean,
  }),
  actions: {
    tick: Schema.Void,
  },
})

const PollingLogic = PollingModule.logic(($) => {
  // suspend/resume: setup-only registration (triggered by host Platform signals)
  $.lifecycle.onSuspend($.state.update((s) => ({ ...s, paused: true })))
  $.lifecycle.onResume($.state.update((s) => ({ ...s, paused: false })))

  return Effect.gen(function* () {
    // Example: tick Action (in real apps, you may drive it via Link or an external timer)
    yield* $.onAction('tick').run(
      $.state.update((s) => ({
        ...s,
        lastUpdatedAt: Date.now(),
      })),
    )
  })
})
```

Meaning of these hooks:

- `onSuspend`: host enters “background/hidden” (tab hidden, app background, etc.).
- `onResume`: host becomes “foreground/visible” again.
- `onReset`: a business “soft reset” such as logout/clear; typically triggered explicitly by the app.

### 3.1 Enable platform lifecycle in React

To make `onSuspend/onResume/onReset` work, provide a Platform implementation in the Runtime environment.
`@logix/react` ships an out-of-the-box Layer:

```ts
import * as Logix from "@logix/core"
import { ReactPlatformLayer, RuntimeProvider } from "@logix/react"
import { Layer } from "effect"

const RootModule = Logix.Module.make("Root", { state: RootState, actions: RootActions })
const RootImpl = RootModule.make({ initial: { /* ... */ }, logics: [RootLogic] })

const appRuntime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, ReactPlatformLayer),
})

export function App() {
  return (
    <RuntimeProvider runtime={appRuntime}>
      {/* your routes / pages */}
    </RuntimeProvider>
  )
}
```

`ReactPlatformLayer` provides a `Logic.Platform` service in the Runtime environment so that the host can trigger `$.lifecycle.onSuspend/onResume/onReset`.
Which browser/app events map to those hooks is up to the host app (or a bridge component).

In `examples/logix-react`, `SessionModuleLayout` demonstrates a simplified bridge:

- Merge `ReactPlatformLayer` into the Runtime.
- In a lightweight React component, listen to `document.visibilitychange`, and on tab visibility transitions, call `emitSuspend/emitResume` on the Platform implementation via `Logic.Platform`.
- Inside modules, use `$.lifecycle.onSuspend/onResume` to log or update state.

> In real projects, you can choose page visibility, route events, or mobile foreground/background events, and map them to Platform lifecycle in one place.

## 4. Summary and recommended practices

- Use `$.lifecycle.onInit/onDestroy` to express module instance start/dispose: load config, init resources, close connections, etc.
- Use watchers (`$.onAction/$.onState` + `$.flow.run/runFork`) for long-running listen-and-react logic; their lifecycle is automatically bound to the ModuleRuntime Scope.
- Use `$.lifecycle.onSuspend/onResume/onReset` for host-level lifecycle; coordinate with the host via a Platform implementation (e.g. `ReactPlatformLayer`) for visibility, session reset, and more.
- In React:
  - global state → app-level Runtime + Modules
  - page/component state → local ModuleImpl + `useModule(Impl)`
  - session-level state → choose a stable `key` and keep-alive (e.g. `useModule(Impl, { key, gcTime })`), and combine with platform lifecycle signals

Together with “Logic flows” and “Managing state”, you can shift from “component thinking” to “modules + lifecycle + watchers”, keeping complex business flows readable, debuggable, and replayable in Logix.

## Next

- Cross-module communication: [Cross-module communication](./cross-module-communication)
- Runtime architecture: [Deep dive](./deep-dive)
- Advanced topic: [Suspense & Async](../advanced/suspense-and-async)
