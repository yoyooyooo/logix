---
title: Bound API ($)
description: Use the Bound API inside logic to read state, dispatch actions, resolve dependencies, and register lifecycle hooks.
---

`$` is the Bound API available inside `Module.logic(...)`.

It provides access to:

- state reads and writes
- action dispatch and watchers
- runtime service lookup
- imported child resolution
- lifecycle registration
- field behavior declaration

## State

```ts
const state = yield* $.state.read

yield* $.state.mutate((draft) => {
  draft.count += 1
})
```

## Actions

```ts
yield* $.dispatch({ _tag: "increment", payload: undefined })
yield* $.dispatchers.increment()
```

## Runtime service lookup

```ts
const service = yield* $.use(UserService)
```

`$.use(Tag)` reads services from the current runtime scope.

## Imported children

```ts
const child = yield* $.imports.get(Child.tag)
const value = yield* child.read((s) => s.value)
```

Imported children must be provided as Programs through `Program.make(..., { capabilities: { imports } })`.

## Lifecycle

```ts
Module.logic(($) => {
  $.lifecycle.onInitRequired(Effect.log("init"))
  $.lifecycle.onDestroy(Effect.log("destroy"))

  return Effect.void
})
```

Lifecycle registration belongs to the declaration phase.

## Field behavior

```ts
Module.logic(($) => {
  $.fields({
    normalized: $.fields.computed({
      deps: ["query"],
      get: (query) => String(query ?? "").trim().toLowerCase(),
    }),
  })

  return Effect.void
})
```

## Notes

- declaration and run phases are distinct
- lifecycle and field declarations belong to the declaration phase
- `$.onAction(...)`, `$.onState(...)`, `$.use(...)`, and `$.imports.get(...)` belong to the run phase

## See also

- [Handle](./handle)
- [Cross-module communication](../../guide/learn/cross-module-communication)
