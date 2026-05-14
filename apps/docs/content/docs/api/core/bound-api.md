---
title: Bound API ($)
description: The module-bound API available inside Module.logic.
---

The Bound API is the `$` value passed to `Module.logic`. It is bound to one module instance and its runtime environment.

## State

```ts
yield* $.state.update((prev) => ({ ...prev, count: prev.count + 1 }))
yield* $.state.mutate((draft) => { draft.count += 1 })
const state = yield* $.state.read
```

## Actions and watchers

```ts
yield* $.onAction("submitted").runLatest(handleSubmit)
yield* $.onState((state) => state.query).debounce(200).runLatest(handleQuery)
```

## Dispatch

```ts
yield* $.dispatch("increment")
yield* $.dispatch({ _tag: "increment", payload: undefined })
yield* $.dispatchers.increment()
```

## Services and imports

```ts
const api = yield* $.use(ApiService)
const child = yield* $.use(Child.tag)
const imported = yield* $.imports.get(Child.tag)
```

## Readiness

```ts
yield* $.readyAfter(loadConfig, { id: "config" })
```

## Field declarations

```ts
$.fields({
  fullName: $.fields.computed({ deps: ["first", "last"], get: (first, last) => `${first} ${last}` }),
})
```

Field declarations are local builder grammar. They compile at program assembly.
