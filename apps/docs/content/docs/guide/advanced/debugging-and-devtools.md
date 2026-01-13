---
title: Debugging and DevTools
description: Observe module behavior with Logix’s debug event pipeline and DevTools panel.
---

At runtime, Logix produces structured debug events for module lifecycle, Action dispatching, state updates, and logic errors. These events can:

- be rendered into UI (timeline, module view, etc.) via the DevTools panel;
- be written to the console or your logging/monitoring system via the Debug layer.

This page first builds a simple mental model, then introduces the Debug layer and the runtime middleware bus.

### Who is this for

- You need to “see” what happens inside Logix Runtime in dev/test (which Action/State changes happened, which modules are running).
- You plan to integrate with your team’s logging/monitoring system, or you want clean integration points for current/future DevTools and visualization tools.

### Prerequisites

- Familiar with `Logix.Runtime.make` and basic Layer usage.
- Understand the basics of Module / Logic.

### What you’ll get

- Enable/disable basic debug output in a project.
- Route Debug events to your own logging/monitoring system.
- Leave clean integration points for DevTools/visualization tooling.

### TL;DR: when to use what?

Remember these two scenarios:

- **Frontend development + DevTools debugging** (most day-to-day development)
  - Mount `<LogixDevtools />` in your React app (see the DevTools docs).
  - Configure `devtools: true` on the Runtime to enable DevTools observability (aggregation window + `trace:effectop` + `trace:react-render`; default `diagnosticsLevel="light"`).
  - In this setup, you usually **don’t need to touch `Debug.layer`**—inspect behavior mainly via the DevTools panel.

- **Logging/monitoring/non-browser environments (Node scripts, tests, backend services)**
  - Use `Logix.Debug.layer` / `Logix.Debug.replace` to control whether Debug events are enabled and where they go.
  - This is a good fit for sending runtime traces to your existing logging/monitoring platform, or observing engine behavior where DevTools is unavailable.

The rest of this page breaks these channels down:

- Sections 1–3: Debug layer (logging/monitoring perspective)
- Section 4: EffectOp runtime middleware bus and how to use `Middleware.withDebug`
- Together with the DevTools docs, you can form the full “DevTools + Debug layer + Middleware” setup.

## 1. Enable basic debug output (Console)

By default, Logix does not print debug information to the console.
To inspect runtime traces in development/testing, add the built-in `Debug.layer` when constructing the Runtime:

```ts
import * as Logix from '@logixjs/core'
import { Layer } from 'effect'

// RootImpl is your Root ModuleImpl
const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer, // your application infrastructure (HTTP, Config, etc.)
    Logix.Debug.layer(), // picks dev/prod debug presets based on NODE_ENV
  ),
})
```

- With this config, Logix will at least emit lifecycle errors and key diagnostics via Effect’s logging system, so fatal issues aren’t silently swallowed.
- In non-production (`NODE_ENV !== 'production'`), `Debug.layer()` enables a dev-friendly preset by default (colored logs + diagnostics). In production, it degrades to a minimal “errors first” mode.

> Tips:
>
> - To control the mode explicitly, use `Logix.Debug.layer({ mode: 'dev' | 'prod' | 'off' })`.
> - If you’ve replaced Effect’s logger elsewhere (e.g. a structured logger), `Debug.layer()` only handles Debug events; it won’t forcibly override your logger configuration.

## 2. Debug event model (overview)

Debug events form a unified structured stream. The core event types are:

- `module:init` / `module:destroy`: module instance creation and destruction
- `action:dispatch`: a module received an Action
- `state:update`: module state changed
- `lifecycle:error`: an error occurred while executing module logic (fail / die)
- `diagnostic`: structured runtime hints (e.g. reducer registration order issues, missing `$.lifecycle.onError`, etc.)

### 2.1 Stable identity and transaction fields

Each event carries identity/transaction fields for aggregation and replay (when applicable):

- `moduleId`: module identifier
- `instanceId`: module instance anchor (recommended for aggregation/correlation)
- `txnSeq` / `txnId`: per-instance transaction sequence and derived id
- `runtimeLabel`: optional runtime grouping label (e.g. app name / scenario label)

### 2.1.1 Performance fields on `state:update` (impact & scheduling)

When you see `state:update` in DevTools or logs, pay attention to these fields:

- `dirtySet`: which fields were affected by this commit (helps explain “incremental vs degraded” behavior)
- `commitMode`: the scheduling/merge mode for this commit (normal/batch/lowPriority)
- `priority`: UI notification priority (normal/low)

Typical meanings:

- `commitMode = "batch"`: comes from an explicit batching window like `dispatchBatch([...])`; multiple synchronous dispatches become one observable commit.
- `commitMode = "lowPriority"` + `priority = "low"`: comes from `dispatchLowPriority(action)`; it doesn’t change transaction semantics, but makes UI notifications merge more gently (still guaranteed and bounded).
- `dirtySet.dirtyAll = true`: the write can’t be tracked stably at field-level; derived/validation may degrade to full recomputation. `dirtySet.reason` explains why (e.g. `unknownWrite` / `customMutation` / `nonTrackablePatch`).

> Note: these fields can be trimmed by `diagnosticsLevel` (off/light/full). If diagnostics are off, you may not see them.

### 2.2 In-host events vs exportable events

Your custom Debug layer receives events like:

```ts
type Event =
  | { type: 'module:init'; moduleId?: string; instanceId?: string; runtimeLabel?: string }
  | { type: 'module:destroy'; moduleId?: string; instanceId?: string; runtimeLabel?: string }
  | { type: 'action:dispatch'; moduleId?: string; instanceId?: string; txnSeq?: number; action: unknown }
  | { type: 'state:update'; moduleId?: string; instanceId?: string; txnSeq?: number; state: unknown }
  | { type: 'lifecycle:error'; moduleId?: string; instanceId?: string; cause: unknown }
  | {
      type: 'diagnostic'
      moduleId?: string
      instanceId?: string
      code: string // e.g. "reducer::late_registration"
      severity: 'error' | 'warning' | 'info'
      message: string // human-readable message
      hint?: string // suggested fix
      actionTag?: string // if related to an Action tag
    }
  | { type: `trace:${string}`; moduleId?: string; instanceId?: string; txnSeq?: number; data?: unknown }
```

You can decide how to handle them (print, report, store, etc.).

One important boundary: **the `Event` received by DebugSink is an “in-host event” and may contain non-serializable fields** (e.g. raw object graphs for `action/state/cause`).

When you need data that is exportable/uploadable/replayable, convert to `RuntimeDebugEventRef` or export an `EvidencePackage`:

- `RuntimeDebugEventRef`: strictly JSON-serializable (`meta` is JsonValue) with explicit downgrade markers.
- `EvidencePackage`: an evidence bundle exported from DevtoolsHub’s window (safe for `JSON.stringify`).

> Practical advice: when writing to logs/monitoring, prefer `RuntimeDebugEventRef` over passing through raw `Event`.

### 2.3 Downgrade markers and error summaries (avoid export crashes)

When an event contains non-serializable data (cycles, BigInt, functions, etc.) or is too large, the export side performs a “downgrade”:

- `downgrade.reason`: `non_serializable | oversized | unknown`
- `errorSummary`: a serializable summary of the error cause (used instead of the raw `cause`)

You can convert in-host events into `RuntimeDebugEventRef` inside a custom sink and report those:

```ts
import * as Logix from '@logixjs/core'
import { Effect } from 'effect'

const sink: Logix.Debug.Sink = {
  record: (event) =>
    Effect.sync(() => {
      const ref = Logix.Debug.toRuntimeDebugEventRef(event, {
        diagnosticsLevel: 'light',
      })
      if (ref) {
        myLogger.info(ref)
      }
    }),
}
```

### 2.4 Export/import evidence packages (strict JSON)

After enabling DevTools (`devtools: true` or manually stacking `Debug.devtoolsHubLayer`), you can export the recent window as an evidence package:

```ts
import * as Logix from '@logixjs/core'

const pkg = Logix.Debug.exportEvidencePackage({
  source: { host: 'browser', label: 'my-run' },
})
const json = JSON.stringify(pkg)
```

You can import the package elsewhere (e.g. offline analysis / regression cases):

```ts
import * as Logix from '@logixjs/core'

const pkg2 = Logix.Observability.importEvidencePackage(JSON.parse(json))
```

### 2.5 Converge Performance Pane

If you hit a performance/correctness regression related to “trait converge”, switch the Timeline area in DevTools to the **Converge** view and dig deeper.

#### 2.5.1 What evidence is required?

- You need evidence events with `kind="trait:converge"`.
- When `diagnosticsLevel="off"`, this kind of evidence is not produced.
- Under `diagnosticsLevel="light"`, some fields are trimmed (e.g. `dirty.rootCount/rootIds`). Audit items will clearly report missing fields as `insufficient_evidence`.
- Key fields at a glance: `configScope` (config source/scope), `reasons` (why this run chose full/dirty), `executionBudgetMs/decisionBudgetMs` (budgets), `thresholds.floorRatio` (auto lower-bound, default 1.05, aligned with the performance gate).

If you need more complete converge evidence (e.g. the width of dirty roots), raise the export level explicitly when constructing the Runtime:

```ts
import * as Logix from '@logixjs/core'
import { Layer } from 'effect'

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    Logix.Debug.diagnosticsLevel('full'),
  ),
  devtools: true,
})
```

#### 2.5.2 How to read the timeline and details

- Lane: grouped by `moduleId + instanceId`
- Txn Bar: one transaction (`txnSeq`), sorted by per-instance monotonic sequence (timestamps are for display only)
- Segments: decision vs execution durations (shown as `n/a` when fields are missing)
- Details panel: evidence field table, Audits (stable ids: `CNV-001..CNV-008`), and copyable code snippets

#### 2.5.3 Suggested workflow: mitigate → capture → roll back overrides

1. **Mitigate first**: use the two code snippets provided by Audits to quickly contain the blast radius:

- Provider override (highest priority): `Logix.Runtime.stateTransactionOverridesLayer(...)`
- Runtime module override (fallback mitigation): `Logix.Runtime.setTraitConvergeOverride(runtime, moduleId, ...)`
- Priority order is fixed: `provider > runtime_module > runtime_default > builtin` (you can see the effective source via the `configScope` evidence field).

For a more complete, recipe-style explanation, see: [Converge scheduling control plane](./converge-control-plane).

2. **Capture into a boundary map**: export the problematic window as an `EvidencePackage` and share it with your team for reproduction. Also lock the key windows into regression cases/benchmarks to prevent drift.

3. **Roll back overrides**: after fixing the root cause, remove the mitigation override and return to default/auto policies so converge decisions cover real production paths again.

### 2.6 Debug vs Effect.Logger: two complementary channels

In real projects, you usually have two “logging-related” channels:

- **Effect.Logger channel**
  - entry points: `Effect.log / Effect.logInfo / Effect.logError / Effect.annotateLogs / Effect.withLogSpan`
  - control: via `Logger.replace / Logger.add`, or Layers like `Logix.Debug.withPrettyLogger` that adjust output styles (logfmt / pretty / JSON / remote collection, etc.)
  - typical use: logs emitted by your business Flow/Service, e.g. in Logic:
    `yield* Effect.log('AppCounterLogic setup')`

- **DebugSink event channel**
  - entry point: Logix Runtime calls `Logix.Debug.record(event)` during module init / Action dispatch / state updates / diagnostics
  - control: provide/replace a `Debug.Sink` implementation via `Logix.Debug.layer` / `Logix.Debug.replace`
  - typical use: module lifecycle, Action/State changes, phase guard / reducer conflicts and other runtime diagnostics

These channels are complementary but independent:

- `Logix.Debug.replace(CustomDebugLayer)` only affects Debug events (`record(event)`); it does not intercept your `Effect.log(...)` calls.
- Replacing the Logger (e.g. via `Logix.Debug.withPrettyLogger` or your own Logger Layer) only changes how Effect logs are rendered; it does not change Debug event structure or dispatch.

A simple mental model:

- “I want business logs” → focus on `Effect.log*` + Logger (with annotations like `logix.moduleId`).
- “I want to see what the Logix engine is doing” → focus on Debug events (`Logix.Debug.layer` or a custom Sink).

## 3. Custom debug layers (integrate with logging/monitoring)

If you want to send debug events into your own logging system or monitoring platform, use `Logix.Debug.replace` or operate on the underlying FiberRef to provide your own set of sinks.

### 3.1 A custom DebugLayer via Layer

```ts
import * as Logix from '@logixjs/core'
import { Effect, Layer } from 'effect'

const CustomDebugLayer = Logix.Debug.replace([
  {
    record: (event: Logix.Debug.Event) =>
      Effect.sync(() => {
        // integrate with your logging/monitoring system here
        myLogger.debug({
          type: event.type,
          moduleId: 'moduleId' in event ? event.moduleId : undefined,
          payload: event,
        })
      }),
  },
])

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    CustomDebugLayer, // custom sinks fully take over debug events
  ),
})
```

### 3.2 Common recommendations

- Local development: use `Logix.Debug.layer({ mode: 'dev' })` for colored logs + basic diagnostics.
- Test environments: combine a custom DebugLayer to write events to memory/files, then assert in tests.
- Production: use `Logix.Debug.layer({ mode: 'prod' })` to keep critical errors/diagnostics, and sample/filter before reporting to logging/monitoring.
- Fully silence DebugSink (keep only normal logs): in rare benchmark/special test scenarios, you can explicitly disable Debug events via `Logix.Debug.noopLayer`:

```ts
const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(
    AppInfraLayer,
    Logix.Debug.noopLayer, // override the default fallback behavior and fully disable Debug event output
  ),
})
```

## 4. Runtime middleware bus (EffectOp)

So far we focused on the DebugSink “debug event pipeline”. Logix also provides a lower-level **runtime middleware bus** built on the EffectOp model, which unifies boundary events like Action / State / Service.

- You can think of an EffectOp as an “Effect wrapper with metadata”:
  - `kind`: the event kind (e.g. `"action"` / `"state"` / `"service"`)
  - `name`: a logical name (Action tag, resource id, etc.)
  - `meta`: structured metadata like module id, field path, link id (`linkId`), etc.
  - `effect`: the actual Effect program to execute
- Before executing these boundary events, Runtime wraps them into EffectOps and runs them through a `MiddlewareStack` (the runtime middleware chain).

At your application entry, configure this bus via `Runtime.make(..., { middleware })`, and use presets from `@logixjs/core/Middleware` to quickly attach debugging capabilities:

```ts
import * as Logix from '@logixjs/core'
import * as Middleware from '@logixjs/core/Middleware'
import { Effect, Layer } from 'effect'

const timingMiddleware: Middleware.Middleware = (op) =>
  Effect.gen(function* () {
    const start = Date.now()
    const result = yield* op.effect
    const duration = Date.now() - start
    console.log('[Timing]', op.kind, op.name, `${duration}ms`)
    return result
  })

// Based on an existing middleware stack, append DebugLogger + DebugObserver presets in one shot.
const stack: Middleware.MiddlewareStack = Middleware.withDebug(
  [timingMiddleware],
  {
    logger: (op) => {
      console.log('[EffectOp]', op.kind, op.name)
    },
    // Optional: use observer to configure filters; defaults apply if not provided.
    observer: {},
  },
)

const runtime = Logix.Runtime.make(RootImpl, {
  layer: AppInfraLayer,
  middleware: stack,
})
```

Some practical notes:

- **General middleware**: like `timingMiddleware` above, you can implement reusable middleware for logging, metrics, rate limiting, circuit breaking, auditing, etc. They only deal with `EffectOp` and `op.effect`, and don’t touch DebugSink directly.
- **Debug middleware**:
  - Prefer `Middleware.withDebug(stack, options?)` to append DebugLogger (logs) and DebugObserver (`trace:effectop`) on top of an existing stack.
  - Only when you need fine-grained ordering or selective enablement should you use `Middleware.applyDebug` / `Middleware.applyDebugObserver` to manipulate the stack directly.
- **Composition**: prefer mounting all runtime middleware at `Runtime.make(..., { middleware })`, so your app decides “which combinations to enable when” (e.g. only enable debug middleware in dev).
- **Event stitching (`linkId`)**: DevTools uses `EffectOp.meta.linkId` to stitch multiple events in the same operation chain (e.g. action/state/trait/service events triggered by one dispatch) so you can reconstruct the full story on the timeline.

### 4.1 Guard: how to explicitly reject an operation

If you need authorization/risk/quota style decisions (“can this run?”), implement a Guard in middleware and return a standardized `OperationRejected` failure when rejected:

```ts
import { Effect, Layer } from 'effect'
import * as Logix from '@logixjs/core'
import * as Middleware from '@logixjs/core/Middleware'
import * as EffectOp from '@logixjs/core/EffectOp'

const guard: Middleware.Middleware = (op) => {
  if (op.kind === 'action' && op.name === 'action:dispatch') {
    return Effect.fail(
      EffectOp.makeOperationRejected({
        message: 'blocked by guard',
        kind: op.kind,
        name: op.name,
        linkId: op.meta?.linkId,
      }),
    )
  }
  return op.effect
}

const runtime = Logix.Runtime.make(RootImpl, {
  layer: Layer.mergeAll(AppInfraLayer, Logix.Debug.layer()),
  middleware: Middleware.withDebug([guard]),
})
```

## 5. DevTools integration: recommended setup

Logix provides official DevTools (via packages like `@logixjs/devtools-react`). It reuses the same Debug event pipeline described above and renders it in the browser:

- Timeline: browse Action / State / EffectOp events in time order
- Module view: inspect which module instances are running and their states
- Error tracking: quickly locate the module/context for `lifecycle:error`

For most frontend + React projects, use this setup:

1. **Mount the DevTools component near the React root**

   ```tsx
   import { LogixDevtools } from '@logixjs/devtools-react'

   export function App() {
     return (
       <>
         <YourAppRoutes />
         <LogixDevtools position="bottom-left" />
       </>
     )
   }
   ```

2. **Enable DevTools on the Runtime**

   ```ts
   import * as Logix from '@logixjs/core'

   const runtime = Logix.Runtime.make(RootImpl, {
     label: 'AppRuntime',
     devtools: true,
   })
   ```

   - `devtools: true` automatically enables the observability DevTools needs (event aggregation, EffectOp observation, React render events, etc.). You don’t need to manually assemble `Middleware.withDebug(...)`.
   - If you already have your own runtime middleware (timing/metrics), you can keep passing it via `middleware`; DevTools wiring will hook into it.
   - Default `diagnosticsLevel="light"` only affects trimming policy for DevtoolsHub / exportable evidence. It does not change DebugSink’s fallback logging semantics.

   > Environment note:
   >
   > - By default, many debug/observability features are reduced based on the environment.
   > - But when you explicitly set `devtools: true`, Logix treats it as “DevTools is explicitly enabled”, and enables the corresponding observability even in production.
   > - Whether to enable in production is your call; prefer enabling only temporarily for debugging, and evaluate event volume and potential overhead.

3. **Do I still need `Debug.layer`?**
   - Pure frontend dev:
     - With DevTools + `withDebug`, you **don’t have to enable `Debug.layer({ mode: 'dev' })`**.
     - DevTools already covers most “observe behavior” needs.
   - Logging/monitoring/non-browser environments (Node scripts, tests, backend services):
     - **Still recommend using `Logix.Debug.layer` / `Logix.Debug.replace`** to route Debug events into your logging/monitoring system.
     - For example: write to memory in tests, write to centralized logging in production.

When designing a new project, reserve two composition points early:

- A Runtime-level composition point: `Logix.Runtime.make(..., { middleware })`, for mounting common middleware and `Middleware.withDebug`.
- A Debug-level composition point: compose `Debug.layer` / custom DebugLayer (if needed) at your app root, plus any DevTools bridge Layers. This helps both DevTools usage and future logging/monitoring integrations.

## 6. Transaction boundaries and logic entry points (mental model)

DevTools’ timeline groups events by “transactions”. You can think of a transaction as: “a continuous runtime trace from a clear entry point, until state is committed”.

### 6.1 When does a new transaction start?

Remember this rule:

- **Every “logic entry point” starts a new transaction**, and a single entry ultimately commits state exactly once (observed as one update + one subscription notification).

Common entry points include:

- `dispatch(action)`: any Action dispatch
- source refresh: e.g. you explicitly trigger a source refresh for some field
- async write-back: e.g. write-back updates after a service request completes (success or failure counts as an entry)
- DevTools operations: e.g. time travel, replay, etc.

### 6.2 Typical examples

1. **A simple click (single transaction)**
   Click button → `dispatch(increment)` → transaction #1: action → state commit

2. **A request with loading (multiple transactions)**
   Click “Load profile” → `dispatch(load)` → transaction #1: commit `loading=true`
   Request completes → write back → transaction #2: commit results like `profile`/`error`

3. **A common pitfall: stuffing a long chain into one entry**
   If you cross a long async boundary inside a single entry and keep updating state after waiting, you end up with a “stretched transaction”.
   Prefer splitting it into multiple explicit entries (e.g. one entry sets loading, another receives results and writes back). This makes transaction boundaries clearer and the DevTools timeline easier to read.

## Next steps

- Learn how to test your modules: [Testing](./testing)
- See the full React integration guide: [React integration](../recipes/react-integration)
- Explore more common patterns: [Common patterns](../recipes/common-patterns)
