---
title: Search + detail
description: Coordinate a list query and a selected detail without moving ownership into React.
---

A search/detail page has two pieces of durable logic: the list query and the selected item. Keep both in a program so navigation, retries, and diagnostics remain outside the component tree.

## State

```ts
const Browser = Logix.Module.make("Browser", {
  state: Schema.Struct({
    q: Schema.String,
    page: Schema.Number,
    selectedId: Schema.NullOr(Schema.String),
    results: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.String })),
    detail: Schema.NullOr(Schema.Struct({ id: Schema.String, title: Schema.String })),
  }),
  actions: {
    qChanged: Schema.String,
    pageChanged: Schema.Number,
    selected: Schema.NullOr(Schema.String),
  },
})
```

`selectedId` is the durable authority. React keys and list indexes are view concerns.

## Coordination

```ts
const BrowserLogic = Browser.logic("browser", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("qChanged").runLatest((action) =>
      $.state.mutate((draft) => {
        draft.q = action.payload
        draft.page = 1
        draft.selectedId = null
      }),
    )

    yield* $.onAction("selected").runLatest((action) =>
      $.state.mutate((draft) => {
        draft.selectedId = action.payload
      }),
    )
  }),
)
```

The selected detail can be fetched through a service, a Query domain program, or a Form source. The same owner rule applies: React reads the result; it does not own the request lifecycle.

## React

```tsx
const browser = useModule(BrowserProgram, { key: "browser" })
const [q, page, selectedId] = useSelector(browser, fieldValues(["q", "page", "selectedId"]))
```

Use `fieldValues` for small UI atoms that are read together. Prefer separate selectors when different components consume different fields.
