---
title: Effect Basics - learn the 20% you need
description: A practical Effect cheat sheet for Logix users.
---

> **Who is this for?**
>
> - You’re using Logix but have never learned Effect / FP systematically.
> - You can read `async/await`, but `Effect.gen` / `Stream` still feels intimidating.
>
> **Prerequisites**
>
> - Basic TypeScript syntax
> - A rough understanding of “async requests”, “error handling”, and “dependency injection (Service)”
>
> **What you’ll get**
>
> - Read most `Effect.gen` usages in the docs and examples
> - Understand what the three type parameters in `Effect.Effect<A, E, R>` mean
> - Know when to stay at the `$` level and when to drop down into Effect

This is not a full Effect course. It’s the **20% you must know to write Logix business code**. If you just want to use Logix effectively, read this page first and look up the rest only when needed.

## 1. Treat Effect as a “safer async function”

Intuitively, you can think of:

- `Effect.Effect<A, E, R>` as “an async function that hasn’t run yet”.
- `A` as the success value type (like `A` in `Promise<A>`).
- `E` as the typed domain error (not an exception; a failure you plan to handle/report).
- `R` as the required environment (a set of dependencies: Services, config, etc.).

In Logix, you will **almost always** write Effects with `Effect.gen(function* () { ... })`:

```ts
const fx = Effect.gen(function* () {
  const user = yield* UserApi.getUser('id-123') // call a Service
  yield* Effect.log(`Loaded user ${user.name}`) // log
  return user // A = User
})
```

- `yield*` feels like `await`, except it’s Effect under the hood.
- `Effect.gen(...)` returns a program that has not run yet; the Logix Runtime runs it at the right time.
- In Logic, you almost never call `Effect.run*` directly; you let `$` execute it via `.run` / `.runLatest`, etc.

> Mental model: **“I’m orchestrating a program, not executing it immediately.”**

## 2. The most common Effect primitives in Logix

When writing business Logic, you can start with a small set of Effect primitives:

- `Effect.gen(function* () { ... })`: write async flows in a synchronous-looking style
- `Effect.map(fx, f)`: transform success values without changing errors/dependencies
- `Effect.flatMap(fx, f)`: continue with the next step based on the previous result
- `Effect.all([...])`: run multiple Effects in parallel/sequence (e.g. multiple requests)
- `Effect.sleep("1 seconds")`: explicitly wait (use sparingly; prefer Flow for throttle/debounce)

In Logix docs and examples, the most common pattern is:

- Outside is `$`’s Fluent DSL (e.g. `$.onAction("submit").run(...)`).
- Inside uses `Effect.gen` to sequence concrete steps (call Services, update state, record analytics, etc.).

```ts
yield*
  $.onAction('submit').run(() =>
    Effect.gen(function* () {
      const api = yield* $.use(UserApi)
      yield* $.state.mutate((draft) => {
        draft.meta.isSubmitting = true
      })

      const result = yield* api.submit(/* ... */)

      yield* $.state.mutate((draft) => {
        draft.meta.isSubmitting = false
        draft.meta.lastResult = result
      })
    }),
  )
```

You don’t need to care how Effect is implemented yet. Just remember:

- The business flow is written inside `Effect.gen(function* () { ... })`.
- Each `yield*` is “the next step”.
- `$` attaches that flow to the right Action / State stream.

## 3. Errors and environment: just know they exist

### 3.1 Domain errors `E`

Effect moves the error channel from `throw` / `catch` into the type system:

- `Effect.Effect<User, ApiError, never>` means “either you get a `User`, or you get an `ApiError`, and it needs no extra environment”.
- In Logix business Logic, you typically translate errors into state/UI messages at the boundary, rather than exposing `E` outward.

As an app developer, two things are enough to remember at first:

- Many examples use `E = never`, meaning “either it succeeds or the Runtime treats failures as defects”.
- When you need finer-grained error control, read the “Error handling” page.

### 3.2 Environment requirements `R`

You can understand `R` as “the set of services this logic needs”, for example:

- `Effect.Effect<User, never, UserApi>` means this logic requires a `UserApi` implementation in the environment.
- In Logix, you typically provide services via Tag + Layer, and access them via `$.use(ServiceTag)` or `$.use(Module)`.

In day-to-day Logic, you usually only need to:

- Get the service instance with `$.use(SomeService)`.
- Provide implementations at the ModuleImpl / Runtime layer via `withLayer` or `Runtime.make`.
- Let TypeScript infer the exact `R` types.

## 4. When should you “drop down” to Effect?

Default guidance:

- **For most business logic**: focus on `$` and treat Effect as “safer async”.
- **Revisit this page (and Advanced/Deep Dive) when you need**:
  - to build reusable Flow / Pattern abstractions across Modules
  - complex concurrency, retry, and timeout strategies
  - precise control over time and error branches in tests

> One-line summary: **treat Logix as an intent-driven state framework first; learn Effect as a composable runtime language when you start building libraries/patterns.**

## Next

- Learn module lifecycle: [Lifecycle](./lifecycle)
- Understand reactive flows deeper: [Flows & Effects](./flows-and-effects)
- Start learning core concepts: [Describing modules](../learn/describing-modules)
