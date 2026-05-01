---
title: Effect basics
description: The minimal Effect mental model needed to read and write Logix logic.
---

Most Logix business logic is written inside `Effect.gen(...)`.

For day-to-day Logix usage, three ideas are enough:

- `Effect` describes work that has not run yet
- `yield*` sequences the next step
- the runtime or `$` decides when the program is executed

## Basic shape

```ts
Effect.Effect<A, E, R>
```

- `A`: success value
- `E`: typed error
- `R`: required environment

## Common form

```ts
const fx = Effect.gen(function* () {
  const user = yield* UserApi.getUser("id-123")
  yield* Effect.log(`Loaded user ${user.name}`)
  return user
})
```

## In Logix logic

```ts
yield* $.onAction("submit").run(() =>
  Effect.gen(function* () {
    const api = yield* $.use(UserApi)
    const result = yield* api.submit()

    yield* $.state.mutate((draft) => {
      draft.lastResult = result
    })
  }),
)
```

## Minimal guidance

- treat `yield*` as the next step in a program
- keep orchestration on `$`
- drop down to Effect details only when concurrency, retries, timeouts, or custom abstractions matter

## See also

- [Flows & Effects](./flows-and-effects)
- [Bound API ($)](../../api/core/bound-api)
