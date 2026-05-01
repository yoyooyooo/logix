---
title: Reactions & Effects
description: React to actions and state changes with Effects and explicit run policies.
---

State and action reactions connect module events to effects.

Common sources are:

- `$.onAction(...)`
- `$.onState(...)`

Effects describe the work executed when those sources emit.

## Action to effect

```ts
const UserLogic = UserModule.logic("user-logic", ($) =>
  $.onAction("fetchUser").run(({ payload: userId }) =>
    Effect.gen(function* () {
      const api = yield* $.use(UserApi)
      const user = yield* api.getUser(userId)

      yield* $.state.mutate((draft) => {
        draft.user = user
      })
    }),
  ),
)
```

## State to effect

```ts
const SearchLogic = SearchModule.logic("search", ($) =>
  $.onState((s) => s.keyword)
    .debounce(300)
    .runLatest((keyword) =>
      Effect.gen(function* () {
        const api = yield* $.use(SearchApi)
        const results = yield* api.search(keyword)

        yield* $.state.mutate((draft) => {
          draft.results = results
        })
      }),
    ),
)
```

## Run policies

The most common policies are:

- `run` for serial execution
- `runLatest` for latest-wins reactions
- `runExhaust` for drop-while-running reactions
- `runParallel` for unbounded parallel execution

## Notes

- Effects describe the work
- Reactions stay in `Logic`
- state writes stay explicit through reducers or `$.state.*`

## See also

- [Effect basics](./effect-basics)
- [Lifecycle](./lifecycle)
- [Bound API ($)](../../api/core/bound-api)
