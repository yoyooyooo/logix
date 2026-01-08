---
title: Interruptible IO (Cancellation and Timeouts)
description: Make `switch` concurrency not only drop old results, but also cancel network requests.
---

# Interruptible IO (Cancellation and Timeouts)

In Logix, queries/resource loading eventually goes through `ResourceSpec.load` (an Effect). When you use `StateTrait.source` (and `@logixjs/query` built on top of it), the default concurrency is `switch`: a new key interrupts the previous in-flight fiber.

But “interrupting a fiber” does not automatically mean “cancelling the network request”. If you want true cancellation (e.g. aborting an axios request), your `load` must actively use the `AbortSignal` provided by Effect.

## 1) The two problems you’ll run into

1. **Race correctness**: when users type quickly, older requests may finish later and must not overwrite the newer result.
2. **Resource waste**: even if old requests won’t be committed to UI, you still don’t want them consuming network and backend capacity.

Logix guarantees (1) by default (via the `keyHash` gate). To get (2), you need to pass `AbortSignal` to your network client.

## 2) Recommended: use `AbortSignal` inside `ResourceSpec.load`

### 2.1 `fetch` (browser / Node 18+)

```ts
import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

export const UserSpec = Logix.Resource.make({
  id: "demo/user/get",
  keySchema: Schema.Struct({ id: Schema.String }),
  load: ({ id }) =>
    Effect.tryPromise({
      try: (signal) =>
        fetch(`/api/users/${id}`, { signal }).then((r) => r.json()),
      catch: (e) => e,
    }),
})
```

### 2.2 axios (`signal` supported in v1+)

```ts
import axios from "axios"
import { Effect, Schema } from "effect"
import * as Logix from "@logixjs/core"

export const SearchSpec = Logix.Resource.make({
  id: "demo/user/search",
  keySchema: Schema.Struct({ q: Schema.String }),
  load: ({ q }) =>
    Effect.tryPromise({
      try: (signal) =>
        axios.get("/api/users", { params: { q }, signal }).then((r) => r.data),
      catch: (e) => e,
    }),
})
```

> Anti-example: `Effect.tryPromise(() => axios.get(...))` does not receive `signal`, so interrupting the fiber can’t truly cancel the request — you only get “old results won’t be committed”.

## 3) How it works with `switch` (what you get)

- **Correct by default**: `switch` + `keyHash` gate ensures old results never overwrite the new key (even if cancellation didn’t happen).
- **Lower resource usage**: once `load` uses `AbortSignal`, `switch` interrupting the old fiber triggers an abort, and the network request can be truly cancelled (saving client and server resources).

## 4) Common add-ons (optional)

- **Timeouts**: for requests that may hang, add a timeout on the `load` Effect (e.g. `Effect.timeoutFail({ duration, onTimeout })`).
- **Retries**: for flaky failures, wrap retries around `load` with `Effect.retry({ times })` (don’t scatter retries at every call site).

## Next

- Query entry and engine wiring: see [Query](../learn/query).
