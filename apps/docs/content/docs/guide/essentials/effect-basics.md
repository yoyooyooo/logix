---
title: Effect basics
description: The Effect concepts used by Logix examples.
---

Logix does not wrap Effect into a different mental model. Logic functions return `Effect` values, services are provided through `Layer`, and failures stay typed until the runtime boundary handles them.

## Effect value

```ts
const program = Effect.gen(function* () {
  const user = yield* UserService.get("u1")
  return user.name
})
```

An `Effect<A, E, R>` describes work that returns `A`, may fail with `E`, and requires environment `R`.

## Service and layer

```ts
class Api extends Effect.Service<Api>()("Api", {
  effect: Effect.succeed({ save: (value: string) => Effect.succeed(value) }),
}) {}

const layer = Api.Default
```

Provide layers at assembly/runtime boundaries. Logic reads services with `$.use(Api)`.

## In Logix logic

```ts
const logic = Module.logic("save", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("save").runLatest((action) =>
      Effect.gen(function* () {
        const api = yield* $.use(Api)
        yield* api.save(action.payload)
      }),
    )
  }),
)
```

Keep Effect composition in logic. Keep component code focused on input and rendering.
