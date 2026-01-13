---
title: Flows & Effects
description: Handle side effects and async logic with Fluent Flow + Effect.
---

In real-world apps, “logic code” is almost never free of side effects:

- sending network requests
- reading/writing local storage
- logging / analytics
- interacting with other Modules / Services

Logix’s approach is:

- Use a single entry point (`$`) to describe the **flow from events to side effects** (Flow).
- Use Effect to express the concrete “what to do” (an Effect program), and manage async and errors consistently.

> If you’re new to Effect, treat this page as “how to write async logic with `$`”.  
> When you want more details, read [Effect Basics](./effect-basics).

## 1. The typical pattern: Action → Effect → update State

The most common pattern is: **a user triggers an Action, you run some async logic, then write the result back to State**.

```ts
// UserLogic.ts
import { Effect } from "effect"
import { UserModule } from "./module"
import { UserApi } from "../services/UserApi"

export const UserLogic = UserModule.logic(($) =>
  Effect.gen(function* () {
    // Watch the "fetchUser" action
    yield* $.onAction("fetchUser").run((userId: string) =>
      Effect.gen(function* () {
        // 1) log (optional)
        yield* Effect.log(`Fetching user ${userId}...`)

        // 2) call external service
        const api = yield* $.use(UserApi)
        const user = yield* api.getUser(userId)

        // 3) write back to state
        yield* $.state.update((s) => ({ ...s, user }))
      }),
    )
  }),
)
```

You can read it like this:

- `$.onAction("fetchUser")` means “from this Module’s Action stream, pick events with `_tag = "fetchUser"`”.
- `.run(handler)` means “for each match, run this Effect as a side effect (sequentially)”.
- `Effect.gen(function* () { ... })` is the synchronous-looking style for “do A, then B, then C”.

## 2. Concurrency: run / runLatest / runExhaust

When users trigger events frequently (double-clicking, typing fast in a search box, etc.), you usually need to control how multiple requests run:

- **`run`**: run sequentially (default)
- **`runLatest`**: keep only the latest request (previous ones are cancelled)
- **`runExhaust`**: ignore later requests while one is still running

You can memorize it with this table:

| API          | Behavior                                       | Typical use cases                              |
| ------------ | ---------------------------------------------- | ---------------------------------------------- |
| `run`        | sequential; run every event fully              | logging, ordered queue processing               |
| `runLatest`  | cancel previous; keep only the latest          | search box, dynamic filters, fast tab switching |
| `runExhaust` | while running, drop later events               | form submit, double-click prevention, idempotent ops |

### 2.1 `run` — sequential

```ts
yield* $.onAction("log").run((msg: string) =>
  Effect.log(`Log: ${msg}`),
)
```

Semantics: every `"log"` event is queued; the next starts only after the previous finishes.

### 2.2 `runLatest` — latest wins (search / input)

```ts
yield* $.onAction("search").runLatest((keyword: string) =>
  Effect.gen(function* () {
    const api = yield* $.use(SearchApi)
    const results = yield* api.search(keyword)
    yield* $.state.update((s) => ({ ...s, results }))
  }),
)
```

Semantics: if the user types `"a" → "ab" → "abc"`, only the last request is kept; earlier ones are cancelled automatically.

### 2.3 `runExhaust` — ignore while running (prevent double submit)

```ts
yield* $.onAction("submit").runExhaust(() =>
  Effect.gen(function* () {
    yield* $.state.mutate((draft) => {
      draft.meta.isSubmitting = true
    })

    const api = yield* $.use(FormApi)
    yield* api.submit(/* ... */)

    yield* $.state.mutate((draft) => {
      draft.meta.isSubmitting = false
    })
  }),
)
```

Semantics: until the current submit flow finishes, any later `"submit"` clicks are ignored.

## 3. Watch State changes: like a stronger useEffect

Often you don’t watch Actions directly. Instead, you want “when a field changes, run follow-up logic”.  
In Logix, that is `$.onState(selector)`:

```ts tab="Logic DSL"
import { Effect } from 'effect'

// When userId changes, debounce 300ms, then dispatch fetchUser.
yield* $.onState((s) => s.userId).pipe(
  $.flow.debounce(300),
  $.flow.filter((userId) => Boolean(userId)),
  $.flow.run((userId) => $.actions.dispatch({ _tag: 'fetchUser', payload: userId })),
)
```

```ts tab="Flow API"
import { Effect } from 'effect'

const userId$ = $.flow.fromState((s) => s.userId)

yield* userId$.pipe(
  $.flow.debounce(300),
  $.flow.filter((userId) => Boolean(userId)),
  $.flow.run((userId) => $.actions.dispatch({ _tag: 'fetchUser', payload: userId })),
)
```

```ts tab="Raw Effect"
import { Stream } from 'effect'

// Mental model: selectors are just Streams under the hood.
yield* Stream.fromEffect($.state.read).pipe(
  Stream.map((s) => s.userId),
  Stream.changes,
  Stream.debounce('300 millis'),
  Stream.filter((userId) => Boolean(userId)),
  Stream.runForEach((userId) => $.actions.dispatch({ _tag: 'fetchUser', payload: userId })),
)
```

You can think of it as:

- `selector` = `useEffect` dependencies
- `.debounce(300)` = debounce at the Stream layer
- `.run(handler)` = run an Effect for each change

Compared to `useEffect`, the benefits are:

- all logic lives in the Module’s Logic, decoupled from UI
- easier reuse and testing
- explicit concurrency semantics—no more “hand-rolled flags + cleanup”

## 4. Dependency injection: use $.use to get Services / other Modules

In Logic, all external dependencies are accessed via `$.use`:

- Pass a Service Tag to get a Service implementation (API, config, storage, etc.).
- Pass another Module to get a read-only handle (read state, watch changes, dispatch actions).

```ts
const Logic = Module.logic(($) =>
  Effect.gen(function* () {
    // 1) Get an API service
    const api = yield* $.use(ApiService)

    // 2) Get another Module handle
    const $Detail = yield* $.use(DetailModule)

    // 3) Drive DetailModule when a field in this module changes
    yield* $.onState((s) => s.selectedId)
      .filter((id) => !!id)
      .run((id) =>
        $Detail.dispatch({ _tag: "detail/initialize", payload: id }),
      )
  }),
)
```

> For a full cross-module collaboration example, see [Cross-module communication](../learn/cross-module-communication).

## 5. Going further

If you’re comfortable writing Logic with `$` and start wondering how the Fluent APIs are implemented under the hood, continue with:

- [Effect Basics: learn the 20% you need](./effect-basics)
- [Logic flows deep dive](../learn/adding-interactivity)
- [Deep dive: Env / Flow / Runtime](../learn/deep-dive)

If you care more about “when modules are created/destroyed, and how to initialize and clean up”, read next:

- 👉 [Lifecycle](./lifecycle)
