---
title: Watcher Patterns and Lifecycles
---

This page explains a few common watcher patterns in Logix, and how they relate to Scope and lifecycle (from a “business code” perspective).

## 1. Start with two dimensions

Before looking at specific APIs, it helps to break a watcher down into two questions:

1. In this Logic block, should the watcher **block** the current fiber?
2. For repeated events, should the Effect run **sequentially**, “keep only the latest/first”, or **explicitly in parallel**?

Logix’s DSL is designed around these two axes:

- “blocking vs non-blocking” — expressed by whether you use `run*` vs `run*Fork`;
- “concurrency model” — expressed by suffixes like `run`, `runLatest`, `runExhaust`, `runParallel`, etc.

In most product code, you only need one rule of thumb:

- **long-lived watchers**: use `yield* $.onAction(...).runFork(...)` or other `run*Fork` variants;
- **one-off flows / pipelines**: use `run`, `runLatest`, etc. as the main body of the Logic.

All examples below apply equally in React integration scenarios; see the React integration guide for details.

## 2. Three common watcher patterns

Inside `Module.logic`, you’ll usually see these three ways to attach watchers (also applicable in React integration):

- `Effect.all([...], { concurrency: "unbounded" })`
- `Effect.fork($.onAction(...).run(...))`
- `yield* $.onAction(...).runFork(...)`

You can read their differences like this (assuming all are in the same Logic):

| Pattern                                   | Typical code                                                                                             | Use case                                                           | Lifecycle / Scope                                                                           | Error handling                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Effect.all` + `run`                       | `Effect.all([ $.onAction("inc").run(...), $.onAction("dec").run(... ) ], { concurrency: "unbounded" })` | multiple watchers in one Logic; simple structure, “start once”     | lives and dies with the Logic; managed by the Logic’s Scope                                 | collected via the global EffectOp middleware stack (IntentBuilder.run promotes each run to an EffectOp)       |
| `Effect.forkScoped($.onAction().run(...))` | `yield* Effect.forkScoped($.onAction("inc").run(...))`                                                  | when you need the Fiber for finer control (e.g. manual interruption) | explicitly attached to the ModuleRuntime Scope; interrupted when the module is disposed     | if a global MiddlewareStack exists, errors/observability go through the EffectOp bus; otherwise plain forkScoped |
| `runFork` (recommended)                    | `yield* $.onAction("inc").runFork(... )`                                                                | “fork a watcher” ergonomics without managing Fiber/safety wrappers  | equivalent to `Effect.fork($.onAction().run(...))`, but with EffectOp+Scope wrapping built in | always goes through the EffectOp middleware bus; easier to observe/guard with Debug/Middleware                |

Recommendations:

- If your Logic only attaches one watcher, prefer the “safe default”:
  - `const Logic = Module.logic(($) => Effect.gen(function* () { yield* $.onAction("...").runFork(...) }))`;
  - it keeps all `yield* $.onAction / $.onState / $.use` inside the generator body and avoids accidentally using run-only capabilities during setup.
- If your Logic attaches multiple watchers, prefer either:
  - `Effect.gen` + multiple `yield* $.onAction(...).runFork(...)`, or
  - `yield* Effect.all([...], { concurrency: "unbounded" })` inside `Effect.gen` to attach them in one place.
- For everyday watchers, `$.onAction(...).run(...)` / `runLatest` / `runExhaust` reads well and makes concurrency semantics explicit.
- Use raw `Effect.forkScoped` only when you truly need manual Fiber management.

## 3. IntentBuilder.run\* and concurrency semantics

From the DSL perspective, the `run*` family is best understood as “the concurrency model within a single watcher”:

- `run`: **sequential**. For one watcher, the next event is processed only after the previous Effect completes.
- `runLatest`: **keep only the latest**. New events cancel the previous in-flight Effect and only the last run is allowed to finish.
- `runExhaust`: **ignore subsequent triggers until the first completes**. Useful for “prevent duplicate submit”.
- `runParallel`: **explicit unbounded concurrency**. Multiple events can trigger Effects concurrently within the same watcher.
- The `Fork` variants (`runFork`, `runParallelFork`, etc.) add one more layer: “attach as a long-lived watcher to the ModuleRuntime Scope”:
  - `runFork` ≈ `Effect.forkScoped($.onAction(...).run(...))`;
  - `runParallelFork` ≈ `Effect.forkScoped($.onAction(...).runParallel(...))`.

One important note:

- In the current implementation, `Flow.run` / `IntentBuilder.run` is **sequential by default**, not “implicitly unbounded concurrency”.
- When you truly need high throughput, use `runParallel` / `runParallelFork` explicitly and document the intent in code/docs.

## 4. IntentBuilder.run and the EffectOp bus

Implementation-wise, every `run*` API is promoted into an EffectOp and executed through the MiddlewareStack:

- `run` / `runLatest` / `runExhaust` / `runParallel`:
  - conceptually: “hand an Action/State stream to the Effect Flow executor with a specific strategy”;
  - in the current implementation, they end up calling `flowApi.run*`, and are wrapped into an EffectOp with `kind = "flow"` plus required metadata.
- `runFork` / `runParallelFork`:
  - roughly similar to `Effect.forkScoped(flowApi.run*(...))`, but wrapped together with the EffectOp bus and Scope handling;
  - this ensures watchers created by these APIs also go through the same Middleware/Debug pipeline.

For product code, this means:

- You can safely use these high-level APIs inside Logic without sprinkling try/catch or instrumentation everywhere.
- If you need uniform logging/metrics/alerts, attach a MiddlewareStack at the engine or ModuleImpl level, instead of repeating it in each watcher.
- For complex logic, keep it inside `Effect.gen`: use `$.use` to get services, `$.state.update/mutate` to update state, and pick a concurrency model via `run*` / `run*Fork`.

### 4.1 `Effect.all` vs `Effect.gen`: equivalent ways to attach multiple `runFork` watchers

The following two snippets are **semantically equivalent** as watchers: both attach two long-lived watchers under the current ModuleRuntime Scope.

```ts
// Option A: Effect.gen + Effect.all to attach multiple runFork at once
const AppCounterLogic = AppCounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* Effect.all(
      [
        $.onAction("increment").runFork(
          $.state.mutate((s) => {
            s.count += 1
          }),
        ),
        $.onAction("decrement").runFork(
          $.state.mutate((s) => {
            s.count -= 1
          }),
        ),
      ],
      { concurrency: "unbounded" }, // only the "startup" is concurrent here
    )
  }),
)

// Option B: sequentially yield* multiple runFork inside Effect.gen
const AppCounterLogic = AppCounterModule.logic(($) =>
  Effect.gen(function* () {
    yield* $.onAction("increment").runFork(
      $.state.mutate((s) => {
        s.count += 1
      }),
    )
    yield* $.onAction("decrement").runFork(
      $.state.mutate((s) => {
        s.count -= 1
      }),
    )
  }),
)
```

Why:

- `runFork` itself forks the watcher fiber under the current Scope and returns `void` quickly.
- For “attaching multiple watchers”, the difference between `Effect.all([...], { concurrency: "unbounded" })` and sequential `yield* runFork(...)` is only whether the *startup action* runs concurrently; it does not change each watcher’s trigger source, concurrency model, or lifecycle.

In practice:

- When there are only a few watchers and the logic is simple, `Effect.gen + multiple yield* runFork` tends to read better and makes it easier to insert initialization in-between.
- When you really just want to “attach a set of watchers at once” and there’s no extra initialization, `Effect.all([...])` is also an equivalent and valid style.

## 5. Watchers and the ModuleRuntime lifecycle

Combined with the instance-Scope explanation in “ModuleRuntime Instances and Lifecycles”, you can think about watcher lifetimes like this:

- **Module-level Scope**:
  - Each `ModuleRuntime` instance has its own Scope.
  - Whether constructed via app-level Runtime (`Logix.Runtime.make`), `ModuleImpl.layer`, or React `useModule`, that Scope is closed when the module is disposed.
  - Watchers started via `Flow.run*` / `runFork` are attached to that Scope.
- **Effect.fork vs runFork**:
  - If you write `yield* Effect.fork($.onAction("...").run(...))` inside Logic, the forked fiber is attached to the Scope of the current Logic.
  - `runFork` is semantically more explicit: it is the “module-level watcher” API, with safety and lifecycle handled by the engine.
- **In React**:
  - In Tag mode (`useModule(Module)`), watchers are attached to the App Runtime Scope and live as long as the runtime.
  - In Impl mode (`useModule(Impl)`), each component-local module instance has its own Scope; on unmount:
    - the React adapter closes the Scope;
    - all watchers attached to it (including runFork) are interrupted.

In other words:

- If you stick to the “use `run*` / `runFork` inside Logic” layer, you can delegate “which Scope is this watcher attached to” to the engine.
- Only when you need a custom Scope across modules/runtimes (e.g. a specialized scheduler hub) should you work directly with `Effect.forkScoped` / Scope APIs.
