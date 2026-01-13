---
title: Effect DI - Move Infrastructure Out of Business Logic
description: Inject dependencies with Tag + Layer to make Logix Logic reusable and testable.
---

A common pain in frontend apps is: **the logic is simple, but to make it work you end up threading API/router/toast/analytics “infrastructure” through every layer**, turning components/hooks into dependency couriers; or you fall back to global singletons, making things harder to test and reuse.

In Logix, the recommended approach is to abstract these capabilities as **Effect Services (Tags)**, provide implementations via **Layer** at runtime, and fetch them on-demand inside Logic via `$.use(...)`.

## 1. Start from the Logix usage (no need to know Effect first)

### 1.1 Define “capabilities”, not “implementations”

```ts
import { Context, Effect } from "effect"

class Api extends Context.Tag("Api")<Api, {
  readonly login: (username: string) => Effect.Effect<void, Error>
}>() {}

class Navigation extends Context.Tag("Navigation")<Navigation, {
  readonly push: (path: string) => Effect.Effect<void>
}>() {}

class Toast extends Context.Tag("Toast")<Toast, {
  readonly show: (message: string) => Effect.Effect<void>
}>() {}
```

### 1.2 Use them on-demand inside Logic (no more prop drilling)

```ts
import { Effect } from "effect"

const loginLogic = Auth.logic(($) =>
  Effect.gen(function* () {
    const api = yield* $.use(Api)
    const nav = yield* $.use(Navigation)
    const toast = yield* $.use(Toast)

    yield* api.login("yoyo")
    yield* Effect.all([nav.push("/dashboard"), toast.show("Welcome back")], {
      concurrency: "unbounded",
    })
  }),
)
```

At this point you already get two wins:

- Logic no longer depends on a specific host (Web / mini-app / Node), only on “capabilities”.
- Dependencies are no longer passed as parameters; components/hooks stop acting as couriers.

## 2. Understanding Effect DI: Layer is where implementations are provided

At app startup (or in tests), use Layer to provide implementations for those Tags:

```ts
import * as Logix from "@logixjs/core"
import { Layer } from "effect"

const EnvLayer = Layer.mergeAll(
  Layer.succeed(Api, { login: (u) => /* ... */ } as any),
  Layer.succeed(Navigation, { push: (p) => /* ... */ } as any),
  Layer.succeed(Toast, { show: (m) => /* ... */ } as any),
)

const runtime = Logix.Runtime.make(RootImpl, { layer: EnvLayer })
```

With the same Logic:

- inject a browser router implementation on Web;
- inject a native navigation implementation in React Native;
- inject mock implementations in Node scripts or tests;

your business code doesn’t change.

## 3. Minimal refactor path for testing (smallest closed loop)

When you want to unit-test a piece of Logic, all you need is a test Layer:

1. Define a minimal interface (Tag) for each external dependency.
2. Provide implementations via `Layer.succeed(Tag, mockImpl)` in tests.
3. Run the same Logic and assert state transitions or structured outputs.

## 4. Migration tips (start with minimal increments)

1. Pick the most painful flow (e.g. login/submit/payment) and Tag-ify it first: remove `api/router/toast` from parameters.
2. Provide implementations at the Runtime boundary (avoid ad-hoc injection inside components).
3. Prioritize logic reused across modules (highest ROI).
4. Keep interfaces minimal: expose only what you need in a Tag; don’t stuff a “big client object” into Env.
